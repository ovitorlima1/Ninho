---
name: Transient save-state tests
description: How to validate loading and disabled controls when development API responses are nearly instantaneous.
---

When testing a pending UI state, introduce deterministic latency in the matching request and verify the busy, loading, and disabled states while that request is still unresolved.

**Why:** Development responses can complete before browser automation inspects the controls. Checking only after the response produces a false negative even when the pending state rendered correctly.

**How to apply:** Delay the targeted request without changing its payload or final response, assert the transient state during the delay, then release it and confirm controls recover and success feedback appears.