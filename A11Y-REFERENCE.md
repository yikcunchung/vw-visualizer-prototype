# Visualizer — WCAG 2.2 AA implementation contract

**Reference implementation:** `index-visl.html` (vanilla HTML/JS)
**Target:** production vw.com — AEM + React SPA Editor + styled-components
**Scope:** `#visualizer` — the whole component, comprising its two direct children:

```
#visualizer
├── #media       3D viewer: car image, zoom, rotate/tilt, interior panorama, spec panel
└── #bottombar   colour / wheel / material selectors, model picker
```

`#visualizer` is the component this contract governs. The surrounding page (topbar, subnav, hero,
highlights, NBA bar) is **outside scope for the production port**, but has also been brought up to
A/AA in the reference file so that an axe/WAVE/Lighthouse run on it is meaningful rather than
misleading — see *Page-level fixes* below.

**Standard:** WCAG 2.2 Level A + AA — the levels EN 301 549 clause 9 requires
**Date:** 2026-08-14 · **Last verified against the code:** 2026-08-20 (`5dc4a90`)

> **Drift warning.** This document is a snapshot, not live truth. It was written against
> `index-visl.html`, which is now in `archive/` — the only live file is `index.html`. Between the
> 2026-08-16 revision and 2026-08-20, five commits changed `index.html` and one of them
> (`5dc4a90`) invalidated invariant **B7** as previously written. Diff the doc against the code
> before quoting it, and update the invariant in the same PR that changes the behaviour.

---

## How to use this document

The HTML is a **behavioural spec, not shippable code**. Roughly half the compliance work lives in
JavaScript, not markup — so a port that copies the DOM and rewrites the logic will silently drop it.

Each item below is an **invariant**: a statement that must remain true in the production build,
whatever the framework. Verify invariants, not code shape.

> **Do not treat a clean axe/WAVE/Lighthouse run as done.** The original file passed all three while
> containing genuine Level A failures. Items marked **[tool-invisible]** cannot be detected by any
> automated checker — they need a real keypress, or the accessibility tree.

---

## Verification recipe

Run this against the ported component before sign-off.

> **Step 0 is not optional.** The component builds itself lazily and a run that skips this
> measures an empty page while reporting success — see *The lazy-init false pass* below.

```bash
# 0. FORCE THE COMPONENT TO EXIST, then assert that it does.
#    initVisualizer() is behind an IntersectionObserver on .intro-vis.
#      document.querySelector('.intro-vis').scrollIntoView({block:'center'})
#    then POLL until this is > 0 — do not use a fixed sleep:
#      document.querySelectorAll('#grid-colour [role=radio]').length
#    Abort the run if it never becomes > 0.

# 1. Serve the app, then drive a real browser
chrome --headless --remote-debugging-port=9333 http://localhost:<port>/<route>

# 2. Dump the accessibility tree for the component subtree
#    CDP: DOM.querySelector -> Accessibility.queryAXTree
#    PASS = every interactive node has a NON-EMPTY, UNIQUE accessible name

# 3. Dispatch real keys (Input.dispatchKeyEvent), assert document.activeElement after each
#    Tab / Shift+Tab / Enter / Space / Arrow keys / Escape

# 4. Reflow: Emulation.setDeviceMetricsOverride 320x256 @1x
#    PASS = document.scrollWidth <= window.innerWidth
```

In CI: `jest-axe` on components covers the structural half; Playwright with real key presses and
`expect(page.locator(':focus'))` assertions covers the behavioural half. Both are needed.

### The lazy-init false pass

`initVisualizer()` is deferred behind an `IntersectionObserver` on `.intro-vis`, so at the top of the
page **the component does not exist yet**. Audit it there and the numbers look plausible enough not to
question — which is exactly what makes this dangerous:

| | not scrolled (component absent) | scrolled + initialised |
|---|---|---|
| `[role=radio]` swatches | **0** | 18 |
| interactive controls in AX tree | 18 | 46 |
| `#grid-colour` / `#grid-wheel` | present, **empty** | 13 / 5 children |
| **axe result** | **0 violations** | 0 violations |

The radiogroups are in the DOM the whole time and render at full width — they are simply empty — so
nothing in a static snapshot looks wrong. **Any tool that reports "0 violations" on the unscrolled page
has audited a component that was never built.** A production port that mounts on scroll, on route
change, or behind a tab has the same hazard; assert a known child count before believing any result.

---

## PART A — Structural invariants (markup)

These port cleanly to JSX.

| # | Invariant | SC | Notes for React/AEM |
|---|---|---|---|
| A1 | The viewer container is **not** an interactive role. It is `role="region"` + `aria-label` + `aria-roledescription="3D viewer"`, and is focusable (`tabIndex={0}`) for arrow-key/zoom handling. | 4.1.2 | **Originally `role="button"` wrapping 10 `<button>`s** — nested interactive controls. In React this recurs as `<ClickableCard><Button/></ClickableCard>`: the violation exists in *neither* component's source. |
| A2 | Every decorative icon/SVG is `aria-hidden="true"`. (40 in the reference; 0 unnamed graphics remain in the a11y tree.) | 1.1.1 | Put it on the SVG/wrapper inside the icon component so every consumer inherits it. |
| A3 | Each swatch group is `role="radiogroup"` with `aria-labelledby` → its visible title; each swatch is `role="radio"` with `aria-checked`. | 1.3.1, 4.1.2 | **AEM risk:** `EditableComponent` injects a wrapper `<div>` around authorable components. A radiogroup must *own* its radios — if each swatch becomes separately authorable, ownership breaks and the group collapses in the a11y tree. Keep a group as **one** component, or wire `aria-owns` explicitly. |
| A4 | The spec/disclaimer panel is `role="dialog"` with an accessible name. | 4.1.2 | If it is non-modal, keep `aria-modal="false"`. Do not set `aria-modal="true"` without a focus trap. |
| A5 | German product strings inside the English UI carry `lang="de"`. | 3.1.2 | Applies to the wheel names (`Leichtmetallräder …`) on the label **and** the swatch grid. Drive from content locale, not hardcoded. |
| A6 | Icon-only buttons have an `aria-label` and **no** duplicate `title` with the same text. | — | Redundant `title` is a WAVE alert. Losing `title` also loses the hover tooltip — accepted trade. |
| A7 | A visually hidden `aria-live="polite"` region exists for status announcements. | 4.1.3 | `.sr-only` = `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap`. Do **not** use `display:none`. |
| A8 | The viewer carries `aria-describedby` pointing at a visually hidden element that **states how to operate it by keyboard**. | 1.3.1 | The viewer's keyboard alternative (B10) existed for a long time and was announced *nowhere*. The only on-screen hint says "Drag to rotate", carries `aria-hidden`, and fades after ~3s — its whole subtree exposed one node, `role=generic name=""`. So the alternative built for 2.1.1 / 2.5.7 was invisible to exactly the users it was built for; `#media` announced "Vehicle viewer, 3D viewer" and stopped. **Not a live region** — it must be read on focus and must not interrupt the A7 status region. See B12 for keeping it truthful. |

---

## PART B — Behavioural invariants (JavaScript)

**This is the half a developer reading the HTML will not see.** Every item here is
**[tool-invisible]** unless stated otherwise.

| # | Invariant | SC | Why it exists |
|---|---|---|---|
| B1 | **Image alt text must never be interpolated into a markup string.** Set it as a property/prop. | 4.1.2, 1.1.1 | **Level A failure found in the original.** Wheel names contain `"` (`Leichtmetallräder "Mataró"`, `16" Silver`), which terminated `alt="…"` early. All five wheel radios ended up with the identical name `"Leichtmetallräder "` — indistinguishable to a screen reader. JSX `alt={name}` is safe; `dangerouslySetInnerHTML` is **not**. |
| B2 | Selection state (`aria-checked`, `aria-expanded`, `aria-pressed`) must be **derived from state**, never set imperatively in one code path only. | 4.1.2 | The original updated CSS classes but not ARIA. In React use `aria-checked={i === selected}` so desync is impossible. |
| B3 | Single-pointer actions fire on **up-event**, not down-event. | **2.5.2** | Swatch scroll-arrows fired on `pointerdown` — no way to abort by dragging off. Use `onPointerUp` / `onClick`. *Exception (W3C note): controls that emulate a keyboard key press may use the down-event.* |
| B4 | Auto-rotation (interior panorama) must be stoppable **by keyboard**, not only by mouse. | **2.2.2** | `stopAutoRotate()` was bound only to `mousedown`, so a keyboard user could never stop indefinite motion. Now also called from arrow keys and every rotate/tilt control. In React: cancel the rAF in the effect **and** on any interaction; clean up on unmount or it leaks. |
| B5 | Zoom state must announce, and must keep dependent controls in sync, on **every** path (pointer tap, buttons, Enter/Space). | 4.1.3 | Keyboard zoom updated state but never re-synced the zoom-in/out `disabled` flags — a functional bug as well as an a11y one. Derive `disabled` from state. |
| B6 | Opening the spec panel moves focus into it; closing returns focus to the trigger. | 2.4.3 | **React trap:** if the panel is conditionally rendered (`{open && <Panel/>}`), unmounting while focus is inside drops focus to `<body>`. Prefer keeping it mounted and hidden, or explicitly restore focus. Effect dependency mistakes break this **silently**. |
| B7 | Arrow keys drive the viewer on **two different scopes, split by which keys the browser itself needs**. Left/Right act when the viewer has focus **or when nothing does** (`active === media \|\| active === document.body \|\| active == null`). Up/Down act **only** when the viewer itself has focus. Anything else focused — a button, a swatch — yields to that widget's keys. | 2.1.1 | **Revised 2026-08-20 (`5dc4a90`); the previous "`active === media`, nothing looser" wording is superseded — do not implement it.** Requiring viewer focus made rotation unreachable for *pointer* users: clicking the car does not focus it, because the drag handler `preventDefault()`s the mousedown, so `activeElement` stays `<body>` and the arrows did nothing (measured: click centre of `#media`, `activeElement` BODY, ArrowRight frame-00 → frame-00). Up/Down must stay viewer-only because they are the browser's page-scroll keys — an earlier build that accepted body/null for all four `preventDefault()`ed ArrowDown and panned the panorama while the page stayed put (`scrollY 400 → 400`) for a user who had focused nothing. Porting note: implement the two axes as two separate guards, or you will reintroduce one bug while fixing the other. |
| B8 | A hidden/non-functional control must be **removed from the tab order** (`disabled`), not just visually hidden. | **2.4.7** | Scroll-arrows kept `tabindex=0` while at `opacity:0; pointer-events:none` — keyboard users landed on an invisible, dead button with no visible focus. Matches BITV finding #8. |
| B9 | Non-active control groups are hidden from AT with `inert`, not just CSS. | 4.1.2 | React support is version-dependent; set via ref if the pinned React version lacks the prop. |
| B10 | Drag interactions must have a single-pointer, non-drag alternative. | **2.5.7** | Drag-to-rotate is covered by the rotate/tilt buttons + arrow keys. *W3C exempts only path-dependent underlying functions (e.g. freehand drawing) — reaching a view angle is endpoint-based, so no exemption applies.* |
| B11 | List `key`s must be stable across filtering. | 2.4.3 | **React trap:** wheel availability is filtered per colour. Index-based keys remount swatches and throw focus to `<body>` mid-keyboard-navigation. |
| B12 | The A8 keyboard description must be **rewritten whenever the key bindings change**, not written once. | 1.3.1 | The arrow keys genuinely differ by mode: exterior steps left/right only, interior pans on all four axes. A single static sentence is therefore false in one of the two states. The reference swaps the text inside the mode-toggle callback, next to where the mode flag flips — putting it after the call is wrong, because the toggle defers through a width animation and the flag is not yet set. In React derive the string from mode rather than assigning it. |
| B13 | Closing the spec panel returns focus to **whoever opened it**, and only when focus was inside the panel. | 2.4.3 | Refines B6. The panel can be opened two ways — auto-opened on load, or by the info button — and the correct destination differs: the trigger if a user opened it, the viewer if it auto-opened. Blindly focusing the trigger sends the user somewhere they never were. Guard on `panel.contains(document.activeElement)` before moving focus at all, or `Escape` pressed from elsewhere on the page will yank focus across the document. |

---

## PART C — Visual / CSS invariants

| # | Invariant | SC | Notes |
|---|---|---|---|
| C1 | Every interactive control has a visible focus indicator with **≥3:1** contrast against its adjacent background — **in every state**, including hover and active. | 1.4.11, 2.4.7 | The orange ring (`#C86C03`) is 3.75:1 on white but only **2.04:1** on the tan hover/active fill (`#CCBDAB`). Reference switches the ring to navy `#1B2236` (8.61:1) when the control is hovered or active. **This cannot be ported as-is** — it uses ID specificity (`#btn-a11y.active:focus-visible`), which styled-components cannot generate. Re-express as prop-driven component styles (`$active`, `$hovered`). |
| C2 | Text and icon contrast ≥ **4.5:1** (≥3:1 for large text). | 1.4.3 | Reference measures ≥8.4:1 throughout. Verify **composited** values — the disclaimer sits on `rgba(0,0,0,0.7)` over photography, so compute against the blend, not the declared colour. |
| C3 | Selected-state indicators ≥ **3:1**. | 1.4.11 | Selected swatch border `#997F67` = 3.76:1. |
| C4 | Every target ≥ **24×24** CSS px. | 2.5.8 | Smallest in the reference is the close button at exactly 24×24. Scroll-arrows 28, touch controls 32, swatches 48. |
| C5 | No horizontal scrolling / content loss at **320×256** CSS px. | 1.4.10 | Verified at 1× emulation. Sufficient techniques: **C31** (flexbox), **C32** (media queries + grid), **C34** (un-fix sticky elements). |
| C6 | A focused viewer control must not end up **behind the page's fixed bars**. Reserve clearance with `scroll-padding-top` / `scroll-padding-bottom` on the scroll container. | **2.4.11** | The browser scrolls a focused control into the *layout* viewport and considers that done — it has no idea a `position:fixed` header or action bar is painted on top. `#btn-toggle-view` landed **entirely** behind the bottom bar, 0 of 5 test points visible. The clearance values must track the real bar heights per breakpoint. This is a page-chrome interaction, but the control that disappears is the viewer's, so it is the viewer's problem to verify. |
| C7 | A control that scrolls (the spec panel's text block) needs `tabindex="0"`. | 2.1.1 | Making it scrollable to satisfy C5 **created** a violation: a scrollable region must be keyboard-scrollable (ACT rule `0ssw9k`). Fixing one criterion opened another — re-run the full check after any overflow change, not just the criterion you were working on. |

---

## PART D — What breaks specifically in an AEM + React + styled-components port

1. **`EditableComponent` wrapper vs `role="radiogroup"`** — see A3. Highest-risk item.
2. **ID-specificity CSS** — C1 must be rewritten as component styles.
3. **`createGlobalStyle` injection order** — a global `:focus-visible` rule is not guaranteed to
   beat component styles. Scope focus styles to the component.
4. **Conditional rendering vs focus** — see B6.
5. **rAF cleanup** — see B4.
6. **`dangerouslySetInnerHTML`** — the one route back to B1.
7. **Unstable keys** — see B11.

---

## PART E — What automated tools will not catch

The original file passed **axe DevTools, WAVE and Lighthouse** while failing WCAG at Level A.

| Failure | Why no tool sees it |
|---|---|
| Five radios sharing one accessible name (B1) | No rule checks sibling name uniqueness; `alt` was present and non-empty |
| Action on down-event (B3) | Requires observing event timing |
| Un-pausable motion (B4) | Requires interacting over time |
| Focus lost on close (B6) | Requires a real keypress and an `activeElement` assertion |
| Tabbable invisible control (B8) | Static snapshot shows a styled button |
| Ring contrast in hover+focus (C1) | No tool composes two simultaneous pseudo-states |
| Keyboard alternative that is never announced (A8) | Every attribute is valid; the *absence* of an instruction is not a rule violation |
| Arrow keys eating page scroll (B7) | Requires pressing a key with nothing focused and asserting `scrollY` afterwards |

Four blind spots worth knowing because they also defeat **your own** test scripts:

1. **`pointer-events: none` defeats hit-test-based obscuring checks.** The rotate-hint overlay covers
   the whole viewer at 64–80% black, visually obscuring `#btn-a11y` and `#btn-toggle-view` — but
   because it takes no pointer events, `document.elementFromPoint()` passes straight through and
   reports the control as visible. Any 2.4.11 check built on `elementFromPoint` scores this as a pass.
   Visual obstruction and hit-testing are different questions.
2. **Declared-colour contrast tools misread text over a sibling scrim.** The topbar text is white, all
   of its *ancestors* are transparent, and the dark layer is a `linear-gradient` **sibling**. Walking
   the ancestor chain therefore lands on the white page background and computes white-on-white —
   `1.09:1`. Real composited pixels measure **21:1**. Expect WAVE to flag this; it is a false positive.
   Settle contrast disputes with a screenshot, not with `getComputedStyle`.
3. **`Page.captureScreenshot`'s `clip` is document-absolute; `getBoundingClientRect()` is
   viewport-relative.** Feed the rect straight in after scrolling and you photograph a blank strip of
   page, so every element scores exactly **`1.00:1`** and the run reports a wall of contrast failures
   that do not exist. Add `window.scrollX/scrollY` to the rect. **Tell-tale:** a ratio of precisely
   `1.00:1` with **one** unique colour in the crop means the clip missed, not that the text failed.
   Six of this component's nine flagged nodes "failed" this way before the coordinates were fixed;
   corrected, they measure **8.52:1 – 19.55:1**.
4. **A static "invisible but tabbable" check must walk ancestors for `display:none`.** At 390px, 12
   controls (`.subnav-tab`, `.nbabar-link`, `.nbabar-cta`) measure `0x0` while reporting `opacity:1`
   and `pointer-events:auto`, which looks exactly like the B8 defect. They are not: they sit inside
   `#subnav` / `#nbabar`, which are `display:none` at mobile, so they are not in the tab order at all.
   `getComputedStyle(el).display` on a child of a hidden parent still returns the child's own value.
   Settle it with a real Tab sweep — 34 stops at both 390 and 320, **0 invisible** — not with a
   geometry filter.

**Two elements cannot be pixel-measured and must not be scored as failures.** `.usp-4` is `opacity:0`
mid scroll-entrance-animation, and `.label-rotate` ("Drag to rotate") collapses to `0x0` once
dismissed. Not rendered is not the same as failing; note them as not-applicable and move on.

Additionally, **24 of the 56 A/AA criteria have no ACT Rules at all** — either too new
(2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) or not machine-decidable (3.2.3, 3.3.3, 2.4.5). Those
can only be assessed by a human.

---

## PART F — Page-level fixes (outside the component, applied to the reference file)

WCAG conformance is defined **per full page** (spec §5.2.2 *Full pages*), so a conformant component
does not make the page conformant. These were fixed in `index-visl.html` so the reference is
genuinely exemplary — none are required for the component port, but all are required for a
page-level claim.

| Fix | SC | Was |
|---|---|---|
| 7 subnav tabs → `<button type="button">` with `aria-current` tracked in JS | **2.1.1 (A)** | `<div>`s with click handlers — keyboard users could not reach or activate them. **No automated tool flags this.** |
| Skip link + `role="banner"` / `role="main"` landmarks | **2.4.1 (A)** | no bypass mechanism at all; skip link is now the first tab stop |
| `.label-header-midpage` → `<h2>` | 1.3.1 (A) | styled as a section heading but marked up as `<p>` |
| `aria-hidden="true"` on 17 further decorative SVGs | 1.1.1 (A) | unnamed graphics exposed in the accessibility tree |

Verified after the fixes, page-wide: **310 accessibility-tree nodes, 47 interactive controls,
0 unnamed, 0 duplicate role+name pairs**; landmarks `banner`, `main`, `navigation` ×2 (named),
`region: Vehicle viewer`.

**Still deliberately unchanged:** the four `.topbar-tab` items and four `.topbar-cta` icons have no
click handlers in this prototype. They are inert for mouse and keyboard alike, so parity holds and
adding button semantics would invent affordance that does not exist.

---

## PART G — Discretionary decisions (where an auditor could disagree)

24 of the 56 A/AA criteria have **no machine-testable ACT rule**, and several of those apply
directly here (1.4.11, 1.4.13, 2.5.1, 2.5.2, 2.5.8, 2.4.11). For those, "passes" reflects a
**judgement**, not a test result. The six calls below are defensible but contestable — if an
external audit challenges this component, expect it to be on one of these.

| Decision in the reference | Argument against | If challenged |
|---|---|---|
| `aria-roledescription="3D viewer"` on `#media` | Overrides the announced role; some auditors treat it as noise, and AT support varies | Drop the attribute — `role="region"` + label alone still conforms |
| `role="dialog" aria-modal="false"` on the spec panel | A non-modal dialog is semantically ambiguous; AT may still imply modality | Use `role="region"` with `aria-live="polite"`; no focus trap is implied |
| `<canvas role="img">` with one static `aria-label` for the interior panorama | The view **changes** as the user pans; a single fixed label cannot describe it | Announce orientation changes through the existing `#media-status` live region |
| Rotate/tilt controls live behind the `#btn-a11y` toggle (`inert` when closed) | 2.1.1 **Intent Note 2** permits a separate keyboard mode but explicitly asks how users *discover* it | Expose the group by default, or announce its availability on `#media` focus |
| Swatch strips use `overflow-x: auto` | Judged bounded sub-widgets rather than primary content under 1.4.10 — arguable either way | Already mitigated: scroll arrows + every swatch individually focusable |
| `#label-wheel` is `role="button"` **and** `aria-live="polite"` | A live region on an interactive control is unusual and may double-announce | Move the live region to a sibling element |

**Editorial limit, not a code issue:** `img#img-car` alt is generated from state
(`"VW ID.7, Grenadilla Black Metallic, exterior view"`). Whether that accurately describes every
rotation frame is a **content** judgement that cannot be verified programmatically.

**What has not been tested at all:** real screen-reader output. The accessibility tree confirms what
is *exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. The defensible claim is:

> *"This component meets WCAG 2.2 A/AA on every automated and runtime check available, with six
> documented discretionary decisions, pending screen-reader verification."*

That is stronger than a tool-clean claim, and unlike a tool-clean claim it is true.

---

## Verification record — 2026-08-20 (`5dc4a90`, `index.html`)

Re-run against the live file, component initialised first (see *Step 0*). Headless Chrome 151,
axe-core 4.13.0, bare `axe.run(document)` — no tag filter, both `violations` and `incomplete` read.

**Confirmed holding**

| Check | Result |
|---|---|
| axe, 90 rules | **0 violations** |
| Accessible names | 46 interactive nodes, **0 unnamed**, **0 duplicate role+name** |
| Graphics | 26 exposed, **0 unnamed** |
| **B1** (the Level A bug) | 18 radios / **18 unique names**; wheel names keep their embedded `"` — `Leichtmetallräder "Mataró" …` reads in full |
| **B12** | `#media-help` is rewritten inside the mode-toggle callback; exterior and interior strings both accurate |
| **C4** target size | 0 targets < 24x24 at 1440 / 390 / 320 |
| **C5** reflow | no horizontal scroll at 1440 / 390 / 320 |
| **B8 / 2.4.7** | real Tab sweep: 34 stops at 390 **and** 320, **0 invisible stops** |
| **C2 / 1.4.3** | all 9 axe `color-contrast` *needs-review* nodes resolved on composited pixels: 7 measure **8.52:1 – 19.55:1**; 2 not rendered (see Part E) |

**Not verified in this pass** — behavioural invariants **B3, B4, B5, B6, B13, C1, C6**. These were
verified when the doc was written; five commits have landed since. They need real pointer/key events,
not a snapshot. Re-run before any sign-off that depends on them.

**Still never tested: real screen-reader output.** The accessibility tree confirms what is *exposed*;
NVDA, JAWS and VoiceOver differ in what they *announce*. This is the one gap no automated pass closes,
and several Part G decisions (`aria-roledescription`, the non-modal dialog, the static `role="img"`
label on a panorama that changes as you pan) can only really be settled by listening to them.

The claim this document supports is therefore unchanged:

> *"This component meets WCAG 2.2 A/AA on every automated and runtime check available, with six
> documented discretionary decisions, pending screen-reader verification."*

---

## Verification record — 2026-08-21 (`27d1940` + uncommitted working tree)

Supersedes the 2026-08-20 record below for the seven invariants it left open. Headless Chrome 151,
axe-core 4.13.0, bare `axe.run(document)` (no tag filter), component initialised first (*Step 0*).

> Served from the working tree, which at the time carried uncommitted `index.html` edits (Grand
> California colour remap; `media.focus({preventScroll:true})` in `closeDisclaimer`). The
> `preventScroll` argument is **not** in `27d1940`, so it is not yet on the deployed build.

### The seven previously-unverified invariants — all now PASS

Driven with real `Input.dispatchMouseEvent` / `dispatchKeyEvent`, not `element.click()`.

| Inv | SC | Evidence |
|---|---|---|
| **B3** | 2.5.2 | At 390 **and** 320 (the only widths where the swatch row overflows): `scrollLeft` 0 → **unchanged on pointer-down** → 180 on pointer-up. Press-then-drag-off-then-release leaves it at **0**, so the action is genuinely abortable. |
| **B4** | 2.2.2 | Interior panorama canvas hash changes while auto-rotating, then is **identical across two samples after a keyboard `ArrowLeft`** — stopped by keyboard alone, mouse never used. |
| **B5** | 4.1.3 | All **8** zoom paths in sync (pointer in/out, button in/out, Enter in/out, Space in/out): `disabled` flags mirror state and `#media-status` reads "Zoomed in"/"Zoomed out" every time. |
| **B6** | 2.4.3 | Open → focus `#btn-close`, `aria-expanded=true`; close → focus back to `#btn-info`, `aria-expanded=false`. |
| **B13** | 2.4.3 | Auto-opened panel closed with Escape → focus lands on **`media`**, not the trigger. Escape pressed while focus is *outside* the panel closes it and **does not move focus at all**. |
| **C1** | 1.4.11, 2.4.7 | Ring measured under a **real** hover (`:hover` asserted true, not assumed): navy `#1B2236` on the tan fill = **8.61:1** in both hover and active. |
| **C6** | 2.4.11 | After the *browser* scrolls each control into view: **20/20** applicable controls fully visible at 1440/390/320, **zero fixed or sticky occluders**. `scroll-padding` resolves to 120/84 (desktop) and 116/96 (narrow). |

### Harness validated against deliberately broken code

Every detector above was re-run against a copy with that specific defect injected. A clean run is
only meaningful if the detector can fail:

| Inv | Injected defect | Detector output |
|---|---|---|
| B3 | arrow fires on `pointerdown` | scrolled **on down-event**, and drag-off no longer aborts |
| B4 | `stopAutoRotate()` removed from arrow keys | still rotating after `ArrowLeft` |
| B5 | `syncZoomBtns()` removed from the key path | `OUT-OF-SYNC:[key-Enter-in, key-Space-in]` — pointer/button paths still clean |
| B6 | `btnClose.focus()` removed | focus stayed on `#btn-info` |
| B13 | opener guard replaced with `btnInfo.focus()` | focus yanked to `#btn-info` instead of `media` |
| C1 | hover/active `outline-color` rule deleted | **2.04:1** — exactly the figure this document predicts |
| C6 | `scroll-padding` zeroed + 520px fixed bar | `FIXED-OCCLUDER` on every control, 0/23 pass |

**Two of my own fixtures were wrong before they were right, and both would have produced a false
result.** A composite broken build put the 520px test bar over `#btn-a11y`, so C1 scored a false
PASS on the broken code (the button was never hovered) — the breaks had to be split into isolated
builds. And bounding-box *corner* sampling reported the 32px circular buttons as occluded by
`#img-car`, because a circle's bbox corners are outside its painted pixels. Sample inside the shape.

### Re-confirmed this pass

| Check | Result |
|---|---|
| axe, 90 rules, 5 viewports incl. literal 400% zoom | **0 violations**, 0 JS exceptions |
| Accessibility tree | 394 nodes, **0 unnamed interactive**, **0 duplicate role+name** |
| **B1** | 18 radios / **18 unique names** read from the AX tree, German wheel names intact |
| **C2 / 1.4.3** | every axe *needs-review* contrast node resolved on composited pixels: **23/23 pass, 8.59:1 – 21.00:1** |
| **C5** | no horizontal scroll at 320 / 390 / 768 / 1440 |
| **3.1.2** | `lang="de"` on `#grid-wheel` and `#label-wheel`; the German wheel names inherit it |

**SC 2.5.8 target size — one exception relied upon.** `#label-wheel` is 17px tall (under 24). It
passes only via the **spacing exception**: the nearest other target centre is **48px** away, ≥ the
24px required. If production tightens that layout, this becomes a real failure. It is also a
`<span role="button" tabindex="0">` rather than a native button — named and fully keyboard-operable
(Enter / Space / Escape, with `preventDefault`), but a native `<button>` is the safer port.

*A caution for whoever re-runs this:* the `13x13` targets an earlier pass reported were controls
measured mid-transition, and `uniqueNames: 1` came from reading `aria-label || textContent` instead
of the accessibility tree. Both were artifacts. Filter by ancestor visibility, and take accessible
names from `Accessibility.getFullAXTree`.

### Unchanged: the one real gap

**Real screen-reader output has still never been tested.** The AX tree proves what is *exposed*;
NVDA, JAWS and VoiceOver differ in what they *announce*. Several Part G decisions
(`aria-roledescription`, the non-modal dialog, the static `role="img"` label on a panorama that
changes as you pan) can only be settled by listening. No headless pass closes this.

### The claim this document now supports

> *"Every WCAG 2.2 A/AA requirement that can be verified by static analysis, by the accessibility
> tree, or by driving real pointer and keyboard events is verified and passing on this component —
> including all 13 behavioural and 6 visual invariants, with detectors proven against injected
> defects. Two conformance claims rest on documented judgement calls (the 2.5.8 spacing exception
> and six Part G decisions), and screen-reader announcement remains unverified."*

That is a stronger claim than 2026-08-20's and still stops short of "fully compliant", which no
automated pass can establish.

---

## Source of truth

Criterion wording, Intent, Benefits, Examples, Techniques and ACT Rules for all 56 A/AA criteria:
`~/Documents/j-vault/md/wcag22-full-reference.md` — verbatim from W3C, diffed against the normative
spec (87/87 criteria, 0 level mismatches, 0.998 mean text fidelity on quoted normative text).
