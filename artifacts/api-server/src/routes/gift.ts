import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  checklistItems,
  giftReservations,
  giftShareLinks,
  profiles,
  reserveGiftSchema,
} from "@workspace/db/schema";

const router = Router();
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,}$/;

function getDatabaseErrorCode(error: unknown): string | undefined {
  const visited = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : null;
  }
  return undefined;
}

function publicItem(item: typeof checklistItems.$inferSelect, reservation?: typeof giftReservations.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    qty: item.qty,
    reserved: Boolean(reservation),
    reservation: reservation
      ? { status: reservation.status, guestName: reservation.guestName }
      : null,
  };
}

/** GET /api/gift/:token — deliberately returns only public gift-list fields. */
router.get("/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  if (!TOKEN_PATTERN.test(token)) {
    res.status(404).json({ error: "Este link não existe ou foi revogado." });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Use the same active-link row lock as revocation. Once the owner has
      // successfully revoked a link, an older public read cannot start or
      // finish assembling private-list data under that token.
      const [share] = await tx.select().from(giftShareLinks).where(and(
        eq(giftShareLinks.token, token),
        isNull(giftShareLinks.revokedAt),
      )).for("update").limit(1);
      if (!share) return { kind: "invalid" as const };

      const [[profile], items, reservations] = await Promise.all([
        tx.select({ displayName: profiles.displayName, babyName: profiles.babyName })
          .from(profiles)
          .where(eq(profiles.userId, share.userId)),
        tx.select().from(checklistItems)
          .where(and(eq(checklistItems.userId, share.userId), eq(checklistItems.status, "A comprar")))
          .orderBy(checklistItems.category, checklistItems.sortOrder, checklistItems.createdAt),
        tx.select().from(giftReservations).where(eq(giftReservations.userId, share.userId)),
      ]);
      return { kind: "found" as const, profile, items, reservations };
    });
    if (result.kind === "invalid") {
      res.status(404).json({ error: "Este link não existe ou foi revogado." });
      return;
    }
    const byItem = new Map(result.reservations.map((reservation) => [reservation.checklistItemId, reservation]));

    res.json({
      ownerName: result.profile?.displayName || null,
      babyName: result.profile?.babyName || null,
      items: result.items.map((item) => publicItem(item, byItem.get(item.id))),
    });
  } catch (err) {
    req.log.error({ err }, "public gift list error");
    res.status(500).json({ error: "Não foi possível carregar esta lista agora." });
  }
});

/** POST /api/gift/:token/reservations — anonymous guest reservation. */
router.post("/:token/reservations", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const parsed = reserveGiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Escolha um item e uma forma de presentear." });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the exact active link before inspecting the item. Link revocation
      // locks the same row, so once revocation returns an old link can no
      // longer create a reservation.
      const [share] = await tx.select().from(giftShareLinks).where(and(
        eq(giftShareLinks.token, token),
        isNull(giftShareLinks.revokedAt),
      )).for("update").limit(1);
      if (!share) return { kind: "invalid" as const };

      // This also serializes a concurrent owner update/delete of the item.
      const [item] = await tx.select().from(checklistItems).where(and(
        eq(checklistItems.id, parsed.data.itemId),
        eq(checklistItems.userId, share.userId),
        eq(checklistItems.status, "A comprar"),
      )).for("update").limit(1);
      if (!item) return { kind: "unavailable" as const };

      const [reservation] = await tx.insert(giftReservations).values({
        userId: share.userId,
        checklistItemId: item.id,
        shareLinkId: share.id,
        guestName: parsed.data.guestName || null,
        status: parsed.data.status,
      }).returning();
      return { kind: "reserved" as const, item, reservation };
    });
    if (result.kind === "invalid") {
      res.status(404).json({ error: "Este link não existe ou foi revogado." });
      return;
    }
    if (result.kind === "unavailable") {
      res.status(404).json({ error: "Este item não está mais disponível." });
      return;
    }
    res.status(201).json({ item: publicItem(result.item, result.reservation) });
  } catch (err: unknown) {
    const databaseCode = getDatabaseErrorCode(err);
    if (databaseCode === "23505") {
      res.status(409).json({ error: "Alguém acabou de reservar este item. Escolha outro para presentear." });
      return;
    }
    // Drizzle errors can include bound values such as the optional guest name.
    // Keep logs useful without retaining visitor-provided information.
    req.log.error({ databaseCode: databaseCode ?? "unknown" }, "gift reservation error");
    res.status(500).json({ error: "Não foi possível reservar este item agora." });
  }
});

export default router;