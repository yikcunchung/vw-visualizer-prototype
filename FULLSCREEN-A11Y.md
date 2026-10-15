# Fullscreen mode: WCAG 2.2 A/AA reference

Covers the fullscreen button and the landscape auto-entry (screens under 960px wide). Each criterion
was checked against its W3C *Understanding* page (2026-10-14) and tested in `tests/fullscreen.spec.js`.
It adds to [`a11y-1`](a11y-1-criteria.md), [`a11y-2`](a11y-2-automated-testing.md) and
[`a11y-3`](a11y-3-implementation.md), which cover normal view; where they differ on fullscreen, this
file is newer.

**Bottom line:** every criterion passes in the cases tested. That is not a claim of full compliance:
see *Not verified*.

## What fullscreen does

- The button (bottom right, 32×32, 12×12 icon) switches `body.in-fullscreen` on and off.
- `#visualizer` becomes a fixed layer over the screen. The viewer takes the height left after the bottom
  bar, which becomes one horizontal row. The turn is instant.
- **Portrait:** the layer is turned 90° so the phone shows a landscape view; drag becomes vertical.
- **Landscape (phones):** turning the phone enters fullscreen by itself. Nothing is turned.
- Works for the exterior car and the interior panorama.

## What a port must do

1. **Block the page behind.** Make everything outside `#visualizer` `inert` while fullscreen is on: the
   siblings of `#visualizer` and of each ancestor, never an ancestor. On exit, undo only what you set.
2. **Escape leaves fullscreen**, one layer per press: an open wheel label, then the disclaimer, then fullscreen.
3. **Focus.** On exit by button or Escape, focus goes to `#btn-fullscreen`. If focus was on something
   that becomes inert on entry, it moves there too. Exits caused by a turn or a resize do not move focus.
4. **Offer it only where the bottom bar fits (500px or more):** portrait height, landscape width. Hide
   the button (`display: none`) and leave fullscreen at 960px wide or more, portrait under 500px tall,
   or landscape under 500px wide. Keep the CSS and the script on the same list.
5. **Landscape opens by itself, on a turn only,** when the viewer was on screen, never at page load.
   Turning back closes it if it opened that way. Closing it with the button or Escape sticks until the
   next turn. No 90° turn in landscape.
6. **Drag follows the layout.** Only while the viewer is turned (portrait) does the exterior rotate on
   the vertical drag; the interior maps a drag down the screen to a drag right across the panorama.
7. **Name the toggle by its label,** not `aria-pressed`: `aria-label` swaps between "Enter fullscreen
   mode" and "Exit fullscreen mode"; the icons are `aria-hidden`.
8. **No rotation animation.** If one is added, switch it off under `prefers-reduced-motion: reduce`.
9. **Never lock the orientation.** Both orientations keep all content and function, with an exit in each.
10. **What works outside works inside.** Zoom (click, Enter/Space, the buttons) and the interior's
    auto-rotation (stopped by a touch, a click, an arrow key or a button) behave as in normal view.
    Bind the stop to `pointerdown`, not `mousedown`: a touch drag fires no mouse events.
11. **Draw the focus ring on top of the viewer.** It is flush with the screen and `#visualizer` clips, so
    the usual outside ring showed on one side only, and an inset outline hides under the picture. Use a
    3px `#C86C03` border on a pseudo-element covering the viewer, with a 3px strip of the page colour
    (`#f6f5f2`) just inside it, so it keeps its 3.4:1 over any photo.
12. **Count the bar's trailing padding when sizing the sections.** The width calculation read
    `scrollWidth`, which leaves out the end padding once the content overflows, so the model select and the
    info button ran 16px into the bar's right padding in fullscreen (12px at 960 to 1280 wide). Measure the
    bar's natural width with `width: max-content` instead.

## Criteria

✅ tested or measured · 🔍 checked in code · ⚪ not required

| SC | What it needs here | Status | Evidence |
|---|---|---|---|
| 1.3.2 Meaningful Sequence (A) | Layout is CSS only; reading order unchanged | 🔍 | Code |
| 1.3.4 Orientation (AA) | Nothing restricted to one orientation; no lock; exit in both | ✅ | Turning tests; no orientation API |
| 1.4.3 Contrast (AA) | Bar text readable | ✅ | axe clean, portrait and 5 landscape sizes |
| 1.4.4 / 1.4.10 Resize, Reflow (AA) | Nothing lost at 320×256 | ✅ | Not offered below 500px (400% zoom is 320×256); the inline layout applies |
| 1.4.11 Non-text Contrast (AA) | Focus ring ≥3:1 against what touches it | ✅ | Measured on pixels, 844×390, both views: 3.44:1 inside, 3.62:1 against the bar (rule 11). Without the strip it was under 3:1 over the photo |
| 1.4.12 Text Spacing (AA) | No new clipping | ✅ | Spot check at 5 sizes: bar grows 1px, nothing new clipped |
| 2.1.1 Keyboard (A) | Toggle is a native button | ✅ | Enter test |
| 2.1.2 No Keyboard Trap (A) | Button and Escape both exit. W3C allows holding focus in a mode if the user can leave, and calls Escape a standard exit | ✅ | Escape tests |
| 2.3.3 Animation from Interactions (**AAA**) | Not required; the turn is instant | ⚪ | No transition in the code |
| 2.4.3 Focus Order (A) | Rules 1 and 3. W3C's dialog pattern: page behind inert, focus back to the button | ✅ | Containment and focus tests |
| 2.4.7 Focus Visible (AA) | Every tab stop visible; the viewer's ring on all four sides | ✅ | Tab sweep, portrait and 5 landscape sizes; ring test |
| 2.4.11 Focus Not Obscured (AA) | No stop hidden by the overlay, disclaimer or clipping | ✅ | Same sweep. The disclaimer can cover controls until Escape (existing) |
| 2.5.1 / 2.5.7 Gestures, Dragging (A, AA) | Buttons and arrow keys still work in both views | ✅ | Drag tests, exterior and interior |
| 2.5.8 Target Size (AA) | Button 32×32; other targets keep spacing | ✅ | axe `target-size` clean |
| 3.2.1 / 3.2.2 On Focus, On Input (A) | No surprise on focus or input | 🔍 | Starts only on a click or a device turn |
| 4.1.2 Name, Role, Value (A) | Name follows state; page behind hidden from assistive technology | ✅ | Label tests; `inert` |
| 4.1.3 Status Messages (AA) | No status message is produced | ⚪ | Not triggered; announcing is optional |

## Measured (2026-10-14)

The viewer gets the screen height minus the 114px bar (844×390: 276px; 500×300: 186px). In portrait the
layout is turned, so 390×844 gives the same 844×276.

- **Clean:** portrait 320×640 to 768×1024; landscape 844×390, 932×430, 640×320, 568×320 and 500×300.
- **Not offered (button hidden):** 499×300 landscape, 390×499 portrait, 400% zoom (320×256), and 960px and wider.
- **Why 500px:** before the landscape rule, fullscreen broke at 640×320, 844×390 and 320×256. The bar's
  row was only as wide as the screen is tall, so swatches were cut off. 500px was clean; 430px was not.

## Tests

`npx playwright test tests/fullscreen.spec.js` covers leaving (Escape, button, growing past 960px),
containment and focus, layout and axe at portrait and landscape sizes in both views, turning the phone,
the drag axis (the panorama gives the same pixels turned or not), rules 10 and 11 (zoom, the auto-rotation
stops including a touch drag, the ring) and rule 12 (the model select stays inside the bar padding, at
fullscreen sizes and at 960 to 1280 wide). `tests/settle.js` waits for the entry fade-ins to end; without
that the axe test at 1440 failed about half the runs.

## Not verified

- No screen-reader pass (VoiceOver, TalkBack, NVDA); see `a11y-2-automated-testing.md`.
- Rotation is simulated with a viewport resize, not tried on a physical iPhone or Android.
- Text spacing is a spot check.

W3C pages: `https://www.w3.org/WAI/WCAG22/Understanding/` (one page per criterion).
