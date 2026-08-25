---
name: Fixed desktop sidebar
description: Constraints for keeping the Ninho desktop navigation pinned during document scrolling.
---

The desktop navigation must use a fixed viewport position with a matching reserved grid column. Do not apply `backdrop-filter`, `transform`, `filter`, or similar containing-block properties to an ancestor of that sidebar.

**Why:** Those properties make a fixed descendant position itself relative to the ancestor instead of the viewport, causing the sidebar to scroll away even when its computed position is `fixed`.

**How to apply:** Keep the sidebar width in sync with the desktop grid column across breakpoints. When changing workspace visual effects, verify desktop scrolling at a content-heavy route and confirm the sidebar's viewport top remains zero.