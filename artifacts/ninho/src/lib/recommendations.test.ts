import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RECOMMENDATION_REFRESH_DELAY_MS,
  RECOMMENDATION_CATALOG,
  getNextRecommendationRefreshDelay,
  getRecommendationDisplayState,
  getVisibleRecommendations,
  isRecommendationAvailable,
  isSafeStoreUrl,
  type Recommendation,
} from "./recommendations.js";

type CatalogDate = Recommendation["expiresAt"];

/** Instantes derivados do próprio catálogo: renovar as datas não quebra os testes. */
const shiftDay = (value: CatalogDate, days: number): CatalogDate => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as CatalogDate;
};

const at = (value: CatalogDate, time: string) => new Date(`${value}T${time}Z`);

const current = RECOMMENDATION_CATALOG[0]!;
const now = at(current.reviewedAt, "12:00:00.000");

test("keeps a current, reviewed recommendation visible", () => {
  assert.equal(isRecommendationAvailable(current, now), true);
  assert.deepEqual(getVisibleRecommendations(now, [current]), [current]);
});

test("excludes expired, manually hidden, and unsafe catalog entries", () => {
  const expired: Recommendation = { ...current, expiresAt: shiftDay(current.reviewedAt, -1) };
  const hidden: Recommendation = { ...current, id: "hidden-copy", visibility: "hidden" };
  const unsafeLink: Recommendation = { ...current, id: "unsafe-link-copy", url: "javascript:alert('unsafe')" };

  assert.equal(isRecommendationAvailable(expired, now), false);
  assert.equal(isRecommendationAvailable(hidden, now), false);
  assert.equal(isRecommendationAvailable(unsafeLink, now), false);
  assert.deepEqual(getVisibleRecommendations(now, [current, expired, hidden, unsafeLink]), [current]);
});

test("treats expired recommendations already linked to a checklist item as unavailable", () => {
  const expired: Recommendation = { ...current, expiresAt: shiftDay(current.reviewedAt, -1) };

  assert.equal(isRecommendationAvailable(expired, now), false);
  assert.equal(isSafeStoreUrl(expired.url), true);
});

test("removes a store URL from an already rendered card after its expiry boundary", () => {
  const beforeExpiry = at(current.expiresAt, "23:59:59.000");
  const afterExpiry = at(shiftDay(current.expiresAt, 1), "00:00:00.000");

  assert.equal(getRecommendationDisplayState(current, beforeExpiry).storeUrl, current.url);
  assert.equal(getRecommendationDisplayState(current, afterExpiry).storeUrl, null);
});

test("clamps the refresh delay to at most one hour", () => {
  const farFromExpiry = getNextRecommendationRefreshDelay(now, [current]);
  assert.equal(farFromExpiry, MAX_RECOMMENDATION_REFRESH_DELAY_MS);

  const nearExpiry = getNextRecommendationRefreshDelay(at(current.expiresAt, "23:30:00.000"), [current]);
  assert.equal(nearExpiry, 30 * 60 * 1000);
  assert.ok(nearExpiry >= 1 && nearExpiry <= MAX_RECOMMENDATION_REFRESH_DELAY_MS);

  const noExpiryFound = getNextRecommendationRefreshDelay(now, [{ ...current, visibility: "hidden" }]);
  assert.equal(noExpiryFound, MAX_RECOMMENDATION_REFRESH_DELAY_MS);
});

/**
 * Alarme proposital de curadoria (F0-R11): usa a data real de hoje, então falha
 * sozinho quando o catálogo se aproxima do vencimento. Para corrigir, renove a
 * curadoria em `recommendations.ts` (novos `reviewedAt`/`expiresAt`) — não
 * afrouxe nem remova este teste.
 */
test("alerta: catálogo precisa de revisão quando faltam menos de 14 dias", () => {
  const minimumValidityDays = 14;
  const today = new Date();
  const visible = RECOMMENDATION_CATALOG.filter((recommendation) => recommendation.visibility === "visible");

  assert.ok(visible.length > 0, "nenhuma recomendação visível no catálogo");

  for (const recommendation of visible) {
    const daysLeft = (at(recommendation.expiresAt, "23:59:59.999").getTime() - today.getTime()) / 86_400_000;
    assert.ok(
      daysLeft >= minimumValidityDays,
      `"${recommendation.id}" expira em ${daysLeft.toFixed(1)} dia(s), abaixo do mínimo de ${minimumValidityDays}: renove o catálogo editorial.`,
    );
  }
});
