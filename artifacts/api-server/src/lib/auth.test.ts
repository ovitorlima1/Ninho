import assert from "node:assert/strict";
import { test } from "vitest";
import {
  passwordResetEmailLimiter,
  passwordResetOriginLimiter,
  type AuthAttemptLimitResult,
} from "./auth";

const HOUR_MS = 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 11, 12, 0, 0);

/**
 * The limiters are process-wide singletons, so every test works on its own
 * keys instead of resetting shared state.
 */
let keySequence = 0;
function uniqueKeys(prefix: string): string[] {
  keySequence += 1;
  return [`${prefix}:${keySequence}`];
}

function blockedRetryAfterSeconds(result: AuthAttemptLimitResult): number {
  assert.equal(result.allowed, false, "expected the attempt to be rejected");
  return result.allowed ? 0 : result.retryAfterSeconds;
}

test("allows three password reset requests per e-mail and blocks the fourth", () => {
  const keys = uniqueKeys("test:account");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    assert.deepEqual(
      passwordResetEmailLimiter.consume(keys, START + attempt),
      { allowed: true },
      `attempt ${attempt} should be allowed`,
    );
  }

  assert.equal(passwordResetEmailLimiter.consume(keys, START + 4).allowed, false);
});

test("allows ten password reset requests per origin and blocks the eleventh", () => {
  const keys = uniqueKeys("test:origin");

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    assert.deepEqual(
      passwordResetOriginLimiter.consume(keys, START + attempt),
      { allowed: true },
      `attempt ${attempt} should be allowed`,
    );
  }

  assert.equal(passwordResetOriginLimiter.consume(keys, START + 11).allowed, false);
});

test("reports a positive retryAfterSeconds once the e-mail limit is reached", () => {
  const keys = uniqueKeys("test:account");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    passwordResetEmailLimiter.consume(keys, START + attempt);
  }

  const retryAfterSeconds = blockedRetryAfterSeconds(passwordResetEmailLimiter.consume(keys, START + 4));
  assert.ok(retryAfterSeconds > 0, "retryAfterSeconds must be greater than zero");
  assert.ok(retryAfterSeconds <= HOUR_MS / 1000, "retryAfterSeconds must not exceed the one hour block");
});

test("accepts new password reset requests after the window passes", () => {
  const emailKeys = uniqueKeys("test:account");
  const originKeys = uniqueKeys("test:origin");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    passwordResetEmailLimiter.consume(emailKeys, START + attempt);
  }
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    passwordResetOriginLimiter.consume(originKeys, START + attempt);
  }

  assert.equal(passwordResetEmailLimiter.consume(emailKeys, START + HOUR_MS - 1000).allowed, false);
  assert.equal(passwordResetOriginLimiter.consume(originKeys, START + HOUR_MS - 1000).allowed, false);

  assert.deepEqual(passwordResetEmailLimiter.consume(emailKeys, START + HOUR_MS + 1), { allowed: true });
  assert.deepEqual(passwordResetOriginLimiter.consume(originKeys, START + HOUR_MS + 1), { allowed: true });
});

test("keeps the e-mail and origin limiters independent", () => {
  const sharedKeys = uniqueKeys("test:shared");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    passwordResetEmailLimiter.consume(sharedKeys, START + attempt);
  }

  assert.equal(passwordResetEmailLimiter.consume(sharedKeys, START + 4).allowed, false);
  // The origin limiter has its own counters and a larger quota.
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    assert.deepEqual(
      passwordResetOriginLimiter.consume(sharedKeys, START + attempt),
      { allowed: true },
      `origin attempt ${attempt} should be allowed`,
    );
  }
  assert.equal(passwordResetOriginLimiter.consume(sharedKeys, START + 11).allowed, false);
});
