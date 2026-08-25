---
name: Password recovery security
description: Security invariants for password reset links and session invalidation.
---

Password recovery links must be created from the configured canonical HTTPS app origin, never from request `Host` or protocol headers. Reset tokens are one-time credentials: store only their hash, expire them quickly, and invalidate all earlier sessions after a successful password change.

**Why:** Request headers can be attacker-controlled; putting a valid reset token into a link built from them can leak account access. A recovered password must also make copied or previously active sessions unusable.

**How to apply:** Keep the production public URL and verified transactional sender explicitly configured. Any future password-reset or email-link flow must preserve these token and session-revocation guarantees.