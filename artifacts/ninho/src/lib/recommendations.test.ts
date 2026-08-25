import assert from "node:assert/strict";
import test from "node:test";
import {
  RECOMMENDATION_CATALOG,
  getRecommendationDisplayState,
  getVisibleRecommendations,
  isRecommendationAvailable,
  isSafeStoreUrl,
  type Recommendation,
} from "./recommendations.js";

const now = new Date("2026-08-26T12:00:00.000Z");
const current = RECOMMENDATION_CATALOG[0]!;

test("keeps a current, reviewed recommendation visible", () => {
  assert.equal(isRecommendationAvailable(current, now), true);
  assert.deepEqual(getVisibleRecommendations(now, [current]), [current]);
});

test("excludes expired, manually hidden, and unsafe catalog entries", () => {
  const expired: Recommendation = { ...current, expiresAt: "2026-08-24" };
  const hidden: Recommendation = { ...current, id: "hidden-copy", visibility: "hidden" };
  const unsafeLink: Recommendation = { ...current, id: "unsafe-link-copy", url: "javascript:alert('unsafe')" };

  assert.equal(isRecommendationAvailable(expired, now), false);
  assert.equal(isRecommendationAvailable(hidden, now), false);
  assert.equal(isRecommendationAvailable(unsafeLink, now), false);
  assert.deepEqual(getVisibleRecommendations(now, [current, expired, hidden, unsafeLink]), [current]);
});

test("treats expired recommendations already linked to a checklist item as unavailable", () => {
  const expired: Recommendation = { ...current, expiresAt: "2026-08-24" };

  assert.equal(isRecommendationAvailable(expired, now), false);
  assert.equal(isSafeStoreUrl(expired.url), true);
});

test("removes a store URL from an already rendered card after its expiry boundary", () => {
  const beforeExpiry = new Date("2026-09-24T23:59:59.000Z");
  const afterExpiry = new Date("2026-09-25T00:00:00.000Z");

  assert.equal(getRecommendationDisplayState(current, beforeExpiry).storeUrl, current.url);
  assert.equal(getRecommendationDisplayState(current, afterExpiry).storeUrl, null);
});