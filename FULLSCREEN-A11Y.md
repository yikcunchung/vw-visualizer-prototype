# Fullscreen mode — WCAG 2.2 A/AA reference

**Scope:** `body.in-fullscreen` — the mode behind `#btn-fullscreen` and the landscape auto-entry (viewports below 960px).
**Standard:** WCAG 2.2 Level A + AA. Each row was cross-checked against the W3C *Understanding* page
for that criterion (fetched 2026-10-14, `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`).
**Verified against:** `index.html`, by `tests/fullscreen.spec.js` (real key events, axe with the WCAG 2.0–2.2
A/AA tags, simulated rotation) and by geometry measurements at the viewports listed below.

This is the fullscreen delta to the main documents, which were written for normal view:
[`a11y-1-criteria.md`](a11y-1-criteria.md) (all 56 criteria), [`a11y-3-implementation.md`](a11y-3-implementation.md)
(what to build) and [`a11y-2-automated-testing.md`](a11y-2-automated-testing.md) (what the tools prove). Where they
disagree about fullscreen, this file is newer (their orientation statements were updated to match).

**Bottom line:** every row below passes in the cases tested. That is not a blanket compliance claim: see
*Not verified* at the end (no screen-reader pass, simulated rather than physical rotation).

---

## What fullscreen does

- `#btn-fullscreen` (32×32, 12×12 icon, bottom-right, 12px from the right and bottom edges) toggles `body.in-fullscreen`.
- `#visualizer` becomes a fixed layer, `z-index: 1000`, filling the screen. `#media` takes the height left after the bottom bar (`flex: 1 1 0`, the bar is content-height, 114px measured); `#bottombar` becomes a horizontal row.
- **Portrait:** the layer is turned 90° (width and height swapped), so the phone shows a landscape view. The drag axis becomes vertical.
- **Landscape (phones, under 960px wide):** turning the phone to landscape enters fullscreen automatically. Nothing is turned, and the drag axis stays horizontal.
- It works in both views: the exterior car and the interior 360° panorama (the bar then shows the material swatches).
- The button's name toggles between "Enter fullscreen mode" and "Exit fullscreen mode". `body` does not scroll while it is on. The rotation is instant, with no transition or animation.

## What a port must do (implementation rules)

1. **Everything outside `#visualizer` is `inert` while fullscreen is on.** Set it on the siblings of `#visualizer` and of each ancestor, never on an ancestor. On exit remove it only from elements you set it on (`#btn-a11y-group` is inert for its own reasons).
2. **Escape leaves fullscreen**, one press per layer, innermost first: an expanded wheel label, then the open disclaimer, then fullscreen.
3. **Focus:** on a manual exit (button, Escape) it goes to `#btn-fullscreen`. When fullscreen opens and focus was left on something now inert, it moves to `#btn-fullscreen`. Changes nobody asked for with a control (rotation, viewport change) do not move focus on the way out.
4. **Offer fullscreen only where the bottom bar's row is 500px or more.** Portrait gives the row the viewport height, landscape the width. Hide the button (`display: none`) and leave fullscreen if it is on when any of these applies: viewport 960px or wider; portrait and 499px tall or less; landscape and 499px wide or less. Keep the CSS and the script on the same list.
5. **Landscape = fullscreen, on rotation only.** A phone turned to landscape enters fullscreen when the viewer was on screen (not at page load, which would cover the page before anyone reached the viewer). Turning back leaves it if it was entered that way. Leaving with the button or Escape sticks until the next turn. In landscape do not apply the 90° turn.
6. **The drag axis follows the layout.** While the viewer is turned (portrait fullscreen) the screen's axes are the canvas's turned 90° clockwise: exterior rotation uses the vertical drag, and the interior panorama maps a drag down the screen to a drag right across the image and a drag left to a drag down. Horizontal and unmapped otherwise.
7. **Toggle by name, not by `aria-pressed`.** The `aria-label` swaps; the two icons are `aria-hidden`. Do not add `aria-pressed` as well.
8. **Do not add a rotation transition.** If one is added, it must switch off under `prefers-reduced-motion: reduce`.
9. **Never lock the orientation** (no Screen Orientation API). Both orientations must keep full content and function, and the exit must exist in both.

## Criteria

Status: ✅ verified by a test or measurement · 🔍 inspected in code · ⚪ not applicable / not required.

| SC | Lvl | W3C says (Understanding) | What fullscreen must do | Status | Evidence |
|---|---|---|---|---|---|
| **1.3.2** Meaningful Sequence | A | Reading order that preserves meaning | Layout is CSS only; DOM order is unchanged | 🔍 | Code: `body.in-fullscreen` rules change layout, not markup |
| **1.3.4** Orientation | AA | "does not restrict its view and operation to a single display orientation" | Adapt to orientation without removing content or function; no lock; exit in both | ✅ | "turning the phone" tests: enters on landscape, leaves on portrait, Escape and the button exit in landscape; no Screen Orientation API in the code |
| **1.4.3** Contrast (Minimum) | AA | 4.5:1 text | Bar text readable on the bar background | ✅ | axe, all A/AA rules: 0 violations, 0 needs-review at 390, 768 and five landscape sizes |
| **1.4.4 / 1.4.10** Resize, Reflow | AA | "without loss of information or functionality … at a width equivalent to 320 CSS pixels … 256" | Nothing lost at 320×256 | ✅ | Fullscreen is not offered below a 500px row (400% zoom is 320×256), so the inline layout applies there. Fullscreen is an optional view: nothing it shows is unavailable inline |
| **1.4.11** Non-text Contrast | AA | Focus indicator ≥3:1 "while its appearance is affected by the overlays" (blur or translucency) | Focus ring ≥3:1 on the bar | 🔍 | Ring `#C86C03`. The bar is `rgba(255,255,255,.6)` over `#f6f5f2`, so about 3.6:1 (calculated, not pixel-measured) |
| **1.4.12** Text Spacing | AA | No loss with the four spacing overrides | No new clipping | ✅ (heuristic) | Overrides injected at 390×844, 768×1024, 844×390, 640×320, 500×300: the bar grows 1px (114 to 115) and no clipped or off-screen control appears that was not already there (scrolling swatch strips, by design). Not an exhaustive audit |
| **2.1.1** Keyboard | A | Everything operable by keyboard | Toggle is a native `<button>` | ✅ | "the toggle button leaves fullscreen" (Enter). W3C does not mention Escape here |
| **2.1.2** No Keyboard Trap | A | Restricting focus to a subsection is allowed "as long as the user knows how to untrap"; "pressing the Esc key is a commonly used standard exit method" | Button and Escape both exit | ✅ | "Escape leaves fullscreen …", "one Escape dismisses one thing" |
| **2.3.3** Animation from Interactions | **AAA** | Interaction-triggered motion can be disabled | Not an AA requirement. Rotation is instant, so there is nothing to disable | ⚪ | No `transition` or `animation` on the layer |
| **2.4.3** Focus Order | A | Modal example: "all web page content outside the dialog becomes inert and cannot receive focus … When the dialog is dismissed, focus returns to the button" | Rules 1 and 3 | ✅ | "Tab never reaches anything outside #visualizer, and inert is restored on exit"; "moves focus in when it was left outside" |
| **2.4.7** Focus Visible | AA | A visible focus indicator | Every tab stop visible | ✅ | "every tab stop is fully visible" at portrait and five landscape sizes |
| **2.4.11** Focus Not Obscured (Min.) | AA | Focused component "not entirely hidden due to author-created content"; non-modal dialogs "typically" dismissed with Esc | No stop hidden by the overlay, the disclaimer or clipping | ✅ | Same tests. The auto-opening disclaimer can cover controls until dismissed (Esc, existing behaviour); the tests close it first |
| **2.5.1 / 2.5.7** Gestures, Dragging | A / AA | Single-pointer alternative to dragging | Rotate buttons and arrow keys still work in both views | ✅ | Keydown handler does not depend on `in-fullscreen`; "the drag axis follows the layout" (exterior) and "the panorama drag follows the layout" (interior) |
| **2.5.8** Target Size (Minimum) | AA | ≥24×24, or the spacing exception | Button 32×32; other targets keep their spacing | ✅ | axe `target-size` clean at every tested size |
| **3.2.1 / 3.2.2** On Focus, On Input | A | No context change on focus or input | Fullscreen starts only on activation, or on a device turn | 🔍 | Neither focus nor input triggers it; the turn is a device action and the exit is always available |
| **4.1.2** Name, Role, Value | A | Names and states available to AT | Name follows state; outside content removed from the AT tree | ✅ | Label asserted in the Escape and toggle tests; `inert` |
| **4.1.3** Status Messages | AA | A status message reports "success or results of an action … progress … errors" | No status message is produced | ⚪ | Not triggered. The repo's README item 3 would announce it anyway: optional, not required for AA |

## Measured layout (2026-10-14)

`#media` height is whatever is left: `#visualizer` is a fixed column the size of the screen and the bar is
content-height (114px), so 844×390 gives a 276px viewer, 640×320 gives 206px, 500×300 gives 186px.
In portrait the layout box is turned, so 390×844 gives the same 844×276 viewer as 844×390.

| Viewport | Fullscreen | Result |
|---|---|---|
| 320×640 … 768×1024 portrait | button, turned | clean |
| 844×390, 932×430, 640×320, 568×320, 500×300 landscape | button or auto on rotation, not turned | clean: all tab stops visible, axe clean |
| 499×300 landscape, 390×499 portrait, 320×256 @400% | not offered | button `display: none` |
| ≥960px wide | not offered | button `display: none` |

Before the landscape rule, fullscreen failed at 640×320, 844×390 and 320×256: the bar's row was only as wide as the
screen is tall, so the colour and wheel sections collapsed, swatch strips were covered, and axe reported
`target-size` (SC 1.4.10, 2.4.7, 2.4.11, 2.5.8). The 500px threshold sits between 430px (failed) and 500px (clean).

## Tests

`tests/fullscreen.spec.js`, run with `npx playwright test tests/fullscreen.spec.js`:

| Test | SC |
|---|---|
| Escape leaves fullscreen from inside the viewer and returns focus to the toggle | 2.1.2, 2.4.3 |
| One Escape dismisses one thing: the disclaimer first, fullscreen on the next press | 2.1.2, 2.4.11 |
| The toggle button leaves fullscreen and keeps focus | 2.1.1, 2.4.3 |
| Growing past 960px while in fullscreen leaves it | rule 4 |
| Tab never reaches anything outside `#visualizer`, and inert is restored on exit | 2.4.3, 2.4.11 |
| Portrait: every tab stop fully visible, axe clean | 1.4.3, 2.4.7, 2.4.11, 2.5.8 |
| Landscape 844×390, 932×430, 640×320, 568×320, 500×300: not turned, every tab stop visible, axe clean | 1.4.10, 2.4.7, 2.4.11, 2.5.8 |
| The button is not offered at 499×300, 320×256 @400% and 390×499 | rule 4 |
| Turning to landscape enters fullscreen, not turned; turning back leaves | 1.3.4 |
| Loading the page in landscape does not cover it | rule 5 |
| Turning to landscape moves focus in when it was left outside the viewer | 2.4.3 |
| Leaving landscape fullscreen with Escape sticks until the next turn | 1.3.4, 2.1.2 |
| The drag axis follows the layout | 2.5.1, 2.5.7 |
| Interior view: every tab stop fully visible, axe clean (portrait; landscape 844×390, 640×320, 500×300) | 2.4.7, 2.4.11, 2.5.8 |
| The panorama drag gives the same view turned or not (same canvas, same pixels) | 2.5.1, 2.5.7 |

One unrelated test fails intermittently, on `main` as well: `structural.spec.js` "component has 0 violations" at desktop-1440.
It samples the bottom bar while it is still fading in (contrast ratios of 1.05–1.12); with a 3-second wait it
reports none. It is a timing artefact of `settle()`, not a fullscreen finding.

## Not verified

- **No screen-reader pass** (VoiceOver, TalkBack, NVDA) on fullscreen. `a11y-2-automated-testing.md` lists this as what automation cannot close.
- **Rotation is simulated** with a viewport resize, which fires the same media-query change events. A physical turn on iOS Safari and Android Chrome has not been tried.
- **Interior mode** is covered for the tab sweep, axe and the drag mapping, not for panorama zoom or the auto-rotation pause in fullscreen.
- **Ring contrast on the bar is calculated** (about 3.6:1), not pixel-measured.
- **Text spacing** is a heuristic check, not a full audit.

## Sources

`orientation`, `meaningful-sequence`, `contrast-minimum`, `resize-text`, `reflow`, `non-text-contrast`,
`text-spacing`, `keyboard`, `no-keyboard-trap`, `animation-from-interactions`, `focus-order`, `focus-visible`,
`focus-not-obscured-minimum`, `pointer-gestures`, `dragging-movements`, `target-size-minimum`, `on-focus`,
`on-input`, `name-role-value`, `status-messages` — all under
`https://www.w3.org/WAI/WCAG22/Understanding/`.
