import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  checklistCategories,
  checklistItems,
  giftReservations,
  giftShareLinks,
  profiles,
  reserveGiftSchema,
} from "@workspace/db/schema";
import { primaryChecklist } from "../lib/checklist-store";
import { giftReservationLimiter, limiterKey } from "../lib/rate-limit";

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

function publicItem(
  item: typeof checklistItems.$inferSelect,
  reservation?: typeof giftReservations.$inferSelect,
  categoryIcon: string | null = null,
) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    categoryIcon,
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

      // O link mostra só a primeira lista (o enxoval): as outras não são de presente (LC-R24).
      const list = await primaryChecklist(tx, share.userId);
      if (!list) return { kind: "found" as const, profile: undefined, items: [], reservations: [], categories: [] };

      const [[profile], items, reservations, categories] = await Promise.all([
        tx.select({ displayName: profiles.displayName, babyName: profiles.babyName })
          .from(profiles)
          .where(eq(profiles.userId, share.userId)),
        tx.select().from(checklistItems)
          .where(and(
            eq(checklistItems.userId, share.userId),
            eq(checklistItems.listId, list.id),
            eq(checklistItems.status, "A comprar"),
          ))
          .orderBy(checklistItems.sortOrder, checklistItems.createdAt),
        tx.select().from(giftReservations).where(eq(giftReservations.userId, share.userId)),
        tx.select().from(checklistCategories)
          .where(and(eq(checklistCategories.userId, share.userId), eq(checklistCategories.listId, list.id)))
          .orderBy(checklistCategories.sortOrder, checklistCategories.id),
      ]);
      return { kind: "found" as const, profile, items, reservations, categories };
    });
    if (result.kind === "invalid") {
      res.status(404).json({ error: "Este link não existe ou foi revogado." });
      return;
    }
    const byItem = new Map(result.reservations.map((reservation) => [reservation.checklistItemId, reservation]));
    // Itens agrupados na ordem das categorias da lista, como a dona vê.
    const order = new Map(result.categories.map((category, index) => [category.id, index]));
    const icons = new Map(result.categories.map((category) => [category.id, category.icon]));
    const rank = (categoryId: number | null) => order.get(categoryId ?? -1) ?? order.size;
    const items = [...result.items].sort((a, b) => rank(a.categoryId) - rank(b.categoryId));

    res.json({
      ownerName: result.profile?.displayName || null,
      babyName: result.profile?.babyName || null,
      items: items.map((item) => publicItem(item, byItem.get(item.id), icons.get(item.categoryId ?? -1) ?? null)),
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

  // A página é pública: um limite por origem evita que alguém esvazie a lista.
  const origin = req.ip || req.socket.remoteAddress || "unknown";
  const rateLimit = await giftReservationLimiter.consume([limiterKey("gift-reservation:origin", origin)]);
  if (!rateLimit.allowed) {
    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({
      error: "Muitas reservas seguidas. Aguarde um pouco antes de tentar de novo.",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
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

      const list = await primaryChecklist(tx, share.userId);
      if (!list) return { kind: "unavailable" as const };

      // This also serializes a concurrent owner update/delete of the item.
      const [item] = await tx.select().from(checklistItems).where(and(
        eq(checklistItems.id, parsed.data.itemId),
        eq(checklistItems.userId, share.userId),
        eq(checklistItems.listId, list.id),
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