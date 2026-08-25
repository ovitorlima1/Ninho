---
name: Responsive workspace shell
description: Visual rule for the authenticated workspace at tablet and mobile sizes.
---

The authenticated Ninho workspace must expand to the available viewport at tablet and mobile widths. Do not reintroduce a decorative device frame, side whitespace, or a duplicate panel-selector control alongside the bottom navigation. On desktop, center the workspace content in the available main area and use route-appropriate reading widths rather than leaving a narrow panel anchored to one side.

**Why:** The product is used as a responsive web app; a constrained phone mockup makes the interface unusable and visually broken on tablets.

**How to apply:** Preserve a full-width active workspace panel below the desktop breakpoint, retain the bottom navigation for small screens, and verify intermediate tablet widths as well as narrow phones after layout changes. Keep wide, data-dense routes spacious while centering form-heavy routes within a comfortable measure.