# Fullscreen mode — WCAG 2.2 A/AA reference

**Scope:** `body.in-fullscreen` — the mode behind `#btn-fullscreen` (viewports below 960px).
**Standard:** WCAG 2.2 Level A + AA. Each row was cross-checked against the W3C *Understanding* page
for that criterion (fetched 2026-10-14, `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`).
**Verified against:** `index.html` on branch `fullscreen-a11y`, by `tests/fullscreen.spec.js`
(real key events, axe with the WCAG 2.0–2.2 A/AA tags) and by geometry measurements at ten viewports.

This is the fullscreen delta to `A11Y-REFERENCE.md`, which was written for normal view and covers
fullscreen only under SC 1.3.4 ("Not assessed"). Where the two disagree, this file is newer.

**Bottom line:** in portrait phones and tablets fullscreen passes every criterion below. It **fails**
(finding F1) when the viewport is short: landscape phones and 400% zoom (320×256). That needs a decision
before the ticket can promise "no SC fails in fullscreen".

---

## What fullscreen does

- `#btn-fullscreen` (32×32, 12×12 icon, bottom-right, 12px from the right and bottom edges) toggles `body.in-fullscreen`.
- `#visualizer` becomes a fixed layer rotated 90°, `z-index: 1000`, `100dvh × 100dvw` swapped. Rotation is instant: there is no transition or animation.
- `#bottombar` becomes a horizontal row beside `#media` (it does not overlap the photo).
- Drag-to-rotate uses the vertical axis. `body` does not scroll.
- The button's name toggles between "Enter fullscreen mode" and "Exit fullscreen mode".

## What a port must do (implementation rules)

1. **Everything outside `#visualizer` is `inert` while fullscreen is on.** Set it on the siblings of `#visualizer` and of each ancestor, never on an ancestor. On exit remove it only from elements you set it on (`#btn-a11y-group` is inert for its own reasons).
2. **Escape leaves fullscreen**, one press per layer, innermost first: an expanded wheel label, then the open disclaimer, then fullscreen.
3. **On exit, focus goes to `#btn-fullscreen`** (button, Escape, or any other path).
4. **Leave fullscreen automatically when the viewport reaches 960px**, because the button is gone at that width and the page would stay covered.
5. **Toggle by name, not by `aria-pressed`.** The `aria-label` swaps; the two icons are `aria-hidden`. Do not add `aria-pressed` as well.
6. **Do not add a rotation transition.** If one is added, it must switch off under `prefers-reduced-motion: reduce`.
7. **Do not lock orientation** (no Screen Orientation API, no `@media (orientation)` that removes content).
8. **Fix F1 before shipping** (below).

## Criteria

Status: ✅ verified by a test or measurement · 🔍 inspected in code · ❌ fails · ⚪ not applicable / not required.

| SC | Lvl | W3C says (Understanding) | What fullscreen must do | Status | Evidence |
|---|---|---|---|---|---|
| **1.3.2** Meaningful Sequence | A | Reading order that preserves meaning | Rotation is CSS only; DOM order is unchanged | 🔍 | Code: `body.in-fullscreen` rules change layout, not markup |
| **1.3.4** Orientation | AA | "does not restrict its view and operation to a single display orientation" | User-invoked, reversible, no orientation lock | 🔍 | No lock and no orientation query in the code. Landscape behaviour: see F1 |
| **1.4.3** Contrast (Minimum) | AA | 4.5:1 text | Bar text readable on the bar background | ✅ portrait | axe, all A/AA rules, 0 violations and 0 needs-review at 390 and 768 |
| **1.4.4 / 1.4.10** Resize, Reflow | AA | "without loss of information or functionality … at a width equivalent to 320 CSS pixels … 256" | Nothing lost at 320×256 | ❌ | **F1** |
| **1.4.11** Non-text Contrast | AA | Focus indicator ≥3:1 "while its appearance is affected by the overlays" (blur or translucency) | Focus ring ≥3:1 on the bar | 🔍 | Ring `#C86C03`. The bar is `rgba(255,255,255,.6)` over `#f6f5f2`, so about 3.6:1 (calculated, not pixel-measured) |
| **1.4.12** Text Spacing | AA | No loss with the four spacing overrides | — | ⚪ not assessed | Not assessed in normal view either |
| **2.1.1** Keyboard | A | Everything operable by keyboard | Toggle is a native `<button>` | ✅ | `fullscreen.spec.js` "the toggle button leaves fullscreen" (Enter). W3C does not mention Escape here |
| **2.1.2** No Keyboard Trap | A | Restricting focus to a subsection is allowed "as long as the user knows how to untrap"; "pressing the Esc key is a commonly used standard exit method" | Button and Escape both exit | ✅ | "Escape leaves fullscreen …" and "one Escape dismisses one thing" |
| **2.3.3** Animation from Interactions | **AAA** | Interaction-triggered motion can be disabled | Not an AA requirement. Rotation is instant, so there is nothing to disable | ⚪ | No `transition` or `animation` on the rotated layer |
| **2.4.3** Focus Order | A | Modal example: "all web page content outside the dialog becomes inert and cannot receive focus … When the dialog is dismissed, focus returns to the button" | Rules 1 and 3 | ✅ | "Tab never reaches anything outside #visualizer, and inert is restored on exit" |
| **2.4.7** Focus Visible | AA | A visible focus indicator | Every tab stop visible | ✅ portrait · ❌ short | "portrait: every tab stop is fully visible"; F1 |
| **2.4.11** Focus Not Obscured (Min.) | AA | Focused component "not entirely hidden due to author-created content"; non-modal dialogs "typically" dismissed with Esc | No stop hidden by the overlay, the disclaimer or clipping | ✅ portrait · ❌ short | Same test; F1. The auto-opening disclaimer can cover the button until dismissed (Esc, existing behaviour) |
| **2.5.1 / 2.5.7** Gestures, Dragging | A / AA | Single-pointer alternative to dragging | Rotate buttons and arrow keys still work | 🔍 | Keydown handler does not depend on `in-fullscreen`; only the drag axis does |
| **2.5.8** Target Size (Minimum) | AA | ≥24×24, or the spacing exception | Button 32×32; other targets keep their spacing | ✅ button · ❌ short | F1 (axe `target-size`) |
| **3.2.1 / 3.2.2** On Focus, On Input | A | No context change on focus or input | Fullscreen starts only on activation | 🔍 | Click handler only |
| **4.1.2** Name, Role, Value | A | Names and states available to AT | Name follows state; outside content removed from the AT tree | ✅ | Label asserted in the Escape and toggle tests; `inert` |
| **4.1.3** Status Messages | AA | A status message reports "success or results of an action … progress … errors" | No status message is produced | ⚪ | Not triggered. The repo's README item 3 would announce it anyway: optional, not required for AA |

## F1 — fullscreen fails when the viewport is short

In fullscreen the viewer is rotated, so the bottom bar's row is as wide as the screen is **tall**.
Portrait phones and tablets give it 800px or more. Landscape phones and 400% zoom give it 256–430px.
Measured 2026-10-14 (smaller side of the section's bounding box on screen; 0 means collapsed):

| Viewport | Colour / wheel section | Focus problems | axe |
|---|---|---|---|
| 320×640 … 768×1024 (portrait) | 86 / 90 px | none | clean |
| 900×500 | 86 / 90 px | none | clean |
| 932×430 | 55 / 55 px | 2 swatch strips covered | clean |
| 844×390 | 35 / 35 px | 2 swatch strips covered | `target-size` `#label-wheel` |
| 640×320 | **0 / 0 px** | swatch strip covered, scroll arrow 44% visible | `target-size` `#bb-scroll-left-colour`, `#label-wheel` |
| 320×256 @400% | **0 / 0 px** | swatch strip covered, scroll arrow 44%, wheel label 81%, model select 87% visible | `target-size` `#label-wheel`; contrast needs review |

Affected: SC 1.4.10 (loss of functionality), 2.4.7, 2.4.11, 2.5.8. The threshold sits between 430px and
500px of viewport height. `a11y-1-criteria.md` row 1.3.4 says fullscreen was tested at 844×390 and 640×320;
it checked that the viewer, the bar and the exit control were present and visible, not that every control
could be reached, so it does not contradict this table.

Options (a decision, not a bug fix):

- **A. Offer fullscreen only when it is useful (recommended).** Rotation exists to give portrait phones a landscape view, so hide the button when the viewport is already landscape (or shorter than about 480px) and leave fullscreen if that changes. Smallest change. All content stays available in both orientations, so SC 1.3.4 is unaffected, but it adds the first orientation media query to a build that documents having none.
- **B. Make fullscreen work in landscape.** No rotation when the viewport is landscape, plus a bar that scrolls or wraps below about 450px of row width. Larger change and a design decision.

The failing cases are kept as `test.fail` in `tests/fullscreen.spec.js`. The suite turns red when one is fixed, which is the cue to remove the marker.

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
| Landscape 844×390 and 640×320 (known failures, F1) | 1.4.10, 2.4.7, 2.4.11, 2.5.8 |

One unrelated test fails on `main` as well: `structural.spec.js` "component has 0 violations" at desktop-1440.
It samples the bottom bar while it is still fading in (contrast ratios of 1.05–1.12); with a 3-second wait it
reports none. It is a timing artefact of `settle()`, not a fullscreen finding.

## Sources

`orientation`, `meaningful-sequence`, `contrast-minimum`, `resize-text`, `reflow`, `non-text-contrast`,
`text-spacing`, `keyboard`, `no-keyboard-trap`, `animation-from-interactions`, `focus-order`, `focus-visible`,
`focus-not-obscured-minimum`, `pointer-gestures`, `dragging-movements`, `target-size-minimum`, `on-focus`,
`on-input`, `name-role-value`, `status-messages` — all under
`https://www.w3.org/WAI/WCAG22/Understanding/`.
