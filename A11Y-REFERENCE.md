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

## Read this first — three things

**1. Do not copy the reference build.** It is vanilla HTML/JS and it is a *behavioural
specification*, not source to port. Roughly **half the required behaviour lives in JavaScript, not
markup** — a port that copies the DOM and rewrites the logic will silently drop it.

**2. A clean axe / WAVE / Lighthouse run does not close this ticket.** The reference passed all
three *while containing genuine Level A failures*. Acceptance is by **accessibility tree + real
keypresses** — see [Definition of Done](#dod).

**3. Do not quote a blanket compliance claim from this document.** What the audit supports:

> Every A/AA criterion verifiable by static analysis, the accessibility tree, or driving real
> pointer and key events **passes — 0 known failures**.
>
> It is **not** certified "fully compliant": a real screen-reader pass has never been run (DoD
> item 6, which this document itself calls *not optional*), **2** criteria pass on documented
> judgement calls, and **6** are site-level or unassessed.

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

## Invariant index

29 invariants. **IDs are stable** — quote them in tickets and PRs.

| # | Invariant | SC |
|---|---|---|
| **A1** | Viewer container is a region, not a control | 4.1.2 |
| **A2** | Decorative icons are aria-hidden | 1.1.1 |
| **A3** | Swatch groups are radiogroups | 1.3.1, 4.1.2 |
| **A4** | Spec panel is a named dialog | 4.1.2 |
| **A5** | German product strings carry lang="de" | 3.1.2 |
| **A6** | Icon-only buttons: aria-label, no duplicate title | — |
| **A7** | A visually hidden polite live region exists | 4.1.3 |
| **A8** | Viewer describes its own keyboard operation | 1.3.1 |
| **A9** | Visible label sits inside the accessible name | 2.5.3 |
| **B1** | Never interpolate alt text into markup | 4.1.2, 1.1.1 |
| **B2** | Selection state derives from state | 4.1.2 |
| **B3** | Pointer actions fire on the up-event | **2.5.2** |
| **B4** | Auto-rotation stoppable by keyboard | **2.2.2** |
| **B5** | Zoom announces and syncs on every path | 4.1.3 |
| **B6** | Panel opening moves focus in | 2.4.3 |
| **B7** | Arrow keys have two scopes | 2.1.1 |
| **B8** | Hidden controls leave the tab order | **2.4.7** |
| **B9** | Inactive groups are inert, not just hidden | 4.1.2 |
| **B10** | Drag has a non-drag alternative | **2.5.7** |
| **B11** | List keys stable across filtering | 2.4.3 |
| **B12** | Keyboard description stays truthful | 1.3.1 |
| **B13** | Panel closing returns focus to its opener | 2.4.3 |
| **C1** | Focus indicator ≥3:1 in every state | 1.4.11, 2.4.7 |
| **C2** | Text and icon contrast ≥4.5:1 | 1.4.3 |
| **C3** | Selected-state indicators ≥3:1 | 1.4.11 |
| **C4** | Every target ≥24×24 CSS px | 2.5.8 |
| **C5** | No content loss at 320×256 | 1.4.10 |
| **C6** | Focused control not behind fixed bars | **2.4.11** |
| **C7** | Scrollable regions are keyboard reachable | 2.1.1 |

**If you only harden four things:** **B7** (one cause, two shipped bugs) · **B1** (a Level A failure that survived axe, Lighthouse *and* WAVE) · **A9** (axe has no `label-in-name` rule) · **B6 / B13** (breaks *silently* in React on a wrong effect-dependency array).

---

## PART A — Structural invariants (markup)

These port cleanly to JSX.
#### A1 — Viewer container is a region, not a control

`SC 4.1.2`

The viewer container is **not** an interactive role. It is `role="region"` + `aria-label` + `aria-roledescription="3D viewer"`, and is focusable (`tabIndex={0}`) for arrow-key/zoom handling.

> **Notes for React/AEM** — **Originally `role="button"` wrapping 10 `<button>`s** — nested interactive controls. In React this recurs as `<ClickableCard><Button/></ClickableCard>`: the violation exists in *neither* component's source.


**In React**

```jsx
// ✗ a button containing ten buttons: invalid HTML, ambiguous activation,
//   polluted accessible name, focus appears to land twice on one object
<div role="button" tabIndex={0} aria-label="Zoom car image"> <Button/> …×10 </div>

// ✓
<div role="region" aria-label="Vehicle viewer" aria-roledescription="3D viewer" tabIndex={0}>
```
---

#### A2 — Decorative icons are aria-hidden

`SC 1.1.1`

Every decorative icon/SVG is `aria-hidden="true"`. (40 in the reference; 0 unnamed graphics remain in the a11y tree.)

> **Notes for React/AEM** — Put it on the SVG/wrapper inside the icon component so every consumer inherits it.

---

#### A3 — Swatch groups are radiogroups

`SC 1.3.1, 4.1.2`

Each swatch group is `role="radiogroup"` with `aria-labelledby` → its visible title; each swatch is `role="radio"` with `aria-checked`.

> **Notes for React/AEM** — **AEM risk:** `EditableComponent` injects a wrapper `<div>` around authorable components. A radiogroup must *own* its radios — if each swatch becomes separately authorable, ownership breaks and the group collapses in the a11y tree. Keep a group as **one** component, or wire `aria-owns` explicitly.


**In React**

```jsx
<div role="radiogroup" aria-labelledby="title-colour">
  <span id="title-colour">Farben</span>
  {colours.map((c,i) => <button role="radio" aria-checked={i===sel} key={c.code}>…</button>)}
</div>
```
---

#### A4 — Spec panel is a named dialog

`SC 4.1.2`

The spec/disclaimer panel is `role="dialog"` with an accessible name.

> **Notes for React/AEM** — If it is non-modal, keep `aria-modal="false"`. Do not set `aria-modal="true"` without a focus trap.

---

#### A5 — German product strings carry lang="de"

`SC 3.1.2`

German product strings inside the English UI carry `lang="de"`.

> **Notes for React/AEM** — Applies to the wheel names (`Leichtmetallräder …`) on the label **and** the swatch grid. Drive from content locale, not hardcoded.


**In React**

```jsx
<span lang="de">Leichtmetallräder "Mataró" …</span>
```
---

#### A6 — Icon-only buttons: aria-label, no duplicate title

*no single SC*

Icon-only buttons have an `aria-label` and **no** duplicate `title` with the same text.

> **Notes for React/AEM** — Redundant `title` is a WAVE alert. Losing `title` also loses the hover tooltip — accepted trade.

---

#### A7 — A visually hidden polite live region exists

`SC 4.1.3`

A visually hidden `aria-live="polite"` region exists for status announcements.

> **Notes for React/AEM** — `.sr-only` = `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap`. Do **not** use `display:none`.


**In React**

```jsx
<span className="sr-only" aria-live="polite">{zoomed ? 'Zoomed in' : 'Zoomed out'}</span>
```
---

#### A8 — Viewer describes its own keyboard operation

`SC 1.3.1`

The viewer carries `aria-describedby` pointing at a visually hidden element that **states how to operate it by keyboard**.

> **Notes for React/AEM** — The viewer's keyboard alternative (B10) existed for a long time and was announced *nowhere*. The only on-screen hint says "Drag to rotate", carries `aria-hidden`, and fades after ~3s — its whole subtree exposed one node, `role=generic name=""`. So the alternative built for 2.1.1 / 2.5.7 was invisible to exactly the users it was built for; `#media` announced "Vehicle viewer, 3D viewer" and stopped. **Not a live region** — it must be read on focus and must not interrupt the A7 status region. See B12 for keeping it truthful.

---


---

#### A9 — Visible label sits inside the accessible name

`SC 2.5.3`

`SC 2.5.3` · **Level A**

if a control has a visible text label, the accessible name must **contain** that text —
otherwise speech-input users cannot activate it by saying what they see.

```jsx
// ✗ visible "Innenraum", name "Interieur anzeigen" — no overlap at all
// ✓
<button aria-label="Innenraum anzeigen">Innenraum</button>
```

**No tool checks this.**

axe-core has **no `label-in-name` rule**. The sibling `cost-simulator` prototype shipped a real
Level A failure here in its *initial* commit:

| Control | Visible | Accessible name |
|---|---|---|
| `#battery-select` | Motor **/** Battery Capacity | Motor **and** battery capacity |
| `#trim-select` | The new ID.3 Neo | Which model are you interested in? |

A single character — the `/` written out as the word "and" — is a Level A failure. axe returned 0
violations, Lighthouse scored 100, WAVE reported 0 errors, and a 55-criterion walk missed it.
Fixed in `22294d7` by pointing `aria-labelledby` at the visible label.

**Borderline case in the reference — decide deliberately.**

`#select-model-lg` carries `aria-label="Select model"` while the adjacent
`<span class="select-label">` displays the *value* ("ID.7").

- **It passes.** W3C: *"where a visible text label does not exist for a component, this success
  criterion does not apply"* — a value display is not a label.
- **But** the element is *named* `select-label`, and a speech user saying "ID.7" would miss it.
- **Prefer** `aria-labelledby` pointing at a genuine visible label.

---

## PART B — Behavioural invariants (JavaScript)

**This is the half a developer reading the HTML will not see.** Every item here is
**[tool-invisible]** unless stated otherwise.

---

#### B1 — Never interpolate alt text into markup

`SC 4.1.2, 1.1.1`

**Image alt text must never be interpolated into a markup string.** Set it as a property/prop.

> **Why it exists** — **Level A failure found in the original.** Wheel names contain `"` (`Leichtmetallräder "Mataró"`, `16" Silver`), which terminated `alt="…"` early. All five wheel radios ended up with the identical name `"Leichtmetallräder "` — indistinguishable to a screen reader. JSX `alt={name}` is safe; `dangerouslySetInnerHTML` is **not**.


**In React**

```jsx
// ✗ the quote closes the attribute early. All five wheel radios ended up named
//   "Leichtmetallräder " — identical, indistinguishable to a screen reader.
el.innerHTML = `<img alt="${name}">`;

// ✓ JSX escapes automatically
<img alt={name} />
// ✓ or, outside JSX
img.alt = name;
```
---

#### B2 — Selection state derives from state

`SC 4.1.2`

Selection state (`aria-checked`, `aria-expanded`, `aria-pressed`) must be **derived from state**, never set imperatively in one code path only.

> **Why it exists** — The original updated CSS classes but not ARIA. In React use `aria-checked={i === selected}` so desync is impossible.


**In React**

```jsx
// ✗ class updated, ARIA forgotten → they desync
btn.className = i === selected ? 'selected' : '';

// ✓ impossible to desync
<button role="radio" aria-checked={i === selected}>
```
---

#### B3 — Pointer actions fire on the up-event

`SC **2.5.2**`

Single-pointer actions fire on **up-event**, not down-event.

> **Why it exists** — Swatch scroll-arrows fired on `pointerdown` — no way to abort by dragging off. Use `onPointerUp` / `onClick`. *Exception (W3C note): controls that emulate a keyboard key press may use the down-event.*


**In React**

```jsx
// ✗ fires immediately; no way to abort by dragging off
<button onPointerDown={scroll}>
// ✓
<button onPointerUp={scroll}>   // or onClick
```
---

#### B4 — Auto-rotation stoppable by keyboard

`SC **2.2.2**`

Auto-rotation (interior panorama) must be stoppable **by keyboard**, not only by mouse.

> **Why it exists** — `stopAutoRotate()` was bound only to `mousedown`, so a keyboard user could never stop indefinite motion. Now also called from arrow keys and every rotate/tilt control. In React: cancel the rAF in the effect **and** on any interaction; clean up on unmount or it leaks.


**In React**

```jsx
// ✓ stop on any interaction, and clean up on unmount or the rAF leaks
useEffect(() => { const id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id); }, [deps]);
onKeyDown={e => { if (isArrow(e.key)) { stopAutoRotate(); pan(e.key); } }}
```
---

#### B5 — Zoom announces and syncs on every path

`SC 4.1.3`

Zoom state must announce, and must keep dependent controls in sync, on **every** path (pointer tap, buttons, Enter/Space).

> **Why it exists** — Keyboard zoom updated state but never re-synced the zoom-in/out `disabled` flags — a functional bug as well as an a11y one. Derive `disabled` from state.

---

#### B6 — Panel opening moves focus in

`SC 2.4.3`

Opening the spec panel moves focus into it; closing returns focus to the trigger.

> **Why it exists** — **React trap:** if the panel is conditionally rendered (`{open && <Panel/>}`), unmounting while focus is inside drops focus to `<body>`. Prefer keeping it mounted and hidden, or explicitly restore focus. Effect dependency mistakes break this **silently**.

---

#### B7 — Arrow keys have two scopes

`SC 2.1.1`

Arrow keys drive the viewer on **two different scopes, split by which keys the browser itself needs**. Left/Right act when the viewer has focus **or when nothing does** (`active === media || active === document.body || active == null`). Up/Down act **only** when the viewer itself has focus. Anything else focused — a button, a swatch — yields to that widget's keys.

> **Why it exists** — **Revised 2026-08-20 (`5dc4a90`); the previous "`active === media`, nothing looser" wording is superseded — do not implement it.** Requiring viewer focus made rotation unreachable for *pointer* users: clicking the car does not focus it, because the drag handler `preventDefault()`s the mousedown, so `activeElement` stays `<body>` and the arrows did nothing (measured: click centre of `#media`, `activeElement` BODY, ArrowRight frame-00 → frame-00). Up/Down must stay viewer-only because they are the browser's page-scroll keys — an earlier build that accepted body/null for all four `preventDefault()`ed ArrowDown and panned the panorama while the page stayed put (`scrollY 400 → 400`) for a user who had focused nothing. Porting note: implement the two axes as two separate guards, or you will reintroduce one bug while fixing the other.


**In React**

```jsx
// ✗ mousedown preventDefault() (to stop image/text drag) ALSO suppresses the default focus.
//   activeElement stays <body>, so every `active === viewer` guard silently fails.
onMouseDown={e => e.preventDefault()}

// ✓ take focus explicitly on pointerdown
onPointerDown={e => {
  if (e.target.closest('button')) return;
  ref.current.focus({ preventScroll: true });   // already under the pointer; scrolling would jump
}}
```

**Scope table**

| Keys | Act when | Why |
|---|---|---|
| Left / Right | viewer focused **or nothing focused** (`body` / `null`) | not page-scroll keys here; this is what lets pointer users rotate |
| Up / Down | viewer focused **only** | they are the browser's page-scroll keys — hijacking them with nothing focused freezes the page while the widget pans |
| Enter | viewer focused or nothing focused | no default page action, so accepting it costs nothing |
| Space | viewer focused **only** | it is the page-scroll key |

---

#### B8 — Hidden controls leave the tab order

`SC **2.4.7**`

A hidden/non-functional control must be **removed from the tab order** (`disabled`), not just visually hidden.

> **Why it exists** — Scroll-arrows kept `tabindex=0` while at `opacity:0; pointer-events:none` — keyboard users landed on an invisible, dead button with no visible focus. Matches BITV finding #8.


**In React**

```jsx
// ✗ opacity:0 + pointer-events:none but still tabbable → focus lands on an
//   invisible dead button with no visible focus indicator
<button className={visible ? 'show' : ''}>
// ✓
<button disabled={!visible}>
```
---

#### B9 — Inactive groups are inert, not just hidden

`SC 4.1.2`

Non-active control groups are hidden from AT with `inert`, not just CSS.

> **Why it exists** — React support is version-dependent; set via ref if the pinned React version lacks the prop.

---

#### B10 — Drag has a non-drag alternative

`SC **2.5.7**`

Drag interactions must have a single-pointer, non-drag alternative.

> **Why it exists** — Drag-to-rotate is covered by the rotate/tilt buttons + arrow keys. *W3C exempts only path-dependent underlying functions (e.g. freehand drawing) — reaching a view angle is endpoint-based, so no exemption applies.*

---

#### B11 — List keys stable across filtering

`SC 2.4.3`

List `key`s must be stable across filtering.

> **Why it exists** — **React trap:** wheel availability is filtered per colour. Index-based keys remount swatches and throw focus to `<body>` mid-keyboard-navigation.

---

#### B12 — Keyboard description stays truthful

`SC 1.3.1`

The A8 keyboard description must be **rewritten whenever the key bindings change**, not written once.

> **Why it exists** — The arrow keys genuinely differ by mode: exterior steps left/right only, interior pans on all four axes. A single static sentence is therefore false in one of the two states. The reference swaps the text inside the mode-toggle callback, next to where the mode flag flips — putting it after the call is wrong, because the toggle defers through a width animation and the flag is not yet set. In React derive the string from mode rather than assigning it.

---

#### B13 — Panel closing returns focus to its opener

`SC 2.4.3`

Closing the spec panel returns focus to **whoever opened it**, and only when focus was inside the panel.

> **Why it exists** — Refines B6. The panel can be opened two ways — auto-opened on load, or by the info button — and the correct destination differs: the trigger if a user opened it, the viewer if it auto-opened. Blindly focusing the trigger sends the user somewhere they never were. Guard on `panel.contains(document.activeElement)` before moving focus at all, or `Escape` pressed from elsewhere on the page will yank focus across the document.

---

## PART C — Visual / CSS invariants

---

#### C1 — Focus indicator ≥3:1 in every state

`SC 1.4.11, 2.4.7`

Every interactive control has a visible focus indicator with **≥3:1** contrast against its adjacent background — **in every state**, including hover and active.

> **Notes** — The orange ring (`#C86C03`) is 3.75:1 on white but only **2.04:1** on the tan hover/active fill (`#CCBDAB`). Reference switches the ring to navy `#1B2236` (8.61:1) when the control is hovered or active. **This cannot be ported as-is** — it uses ID specificity (`#btn-a11y.active:focus-visible`), which styled-components cannot generate. Re-express as prop-driven component styles (`$active`, `$hovered`).

---

#### C2 — Text and icon contrast ≥4.5:1

`SC 1.4.3`

Text and icon contrast ≥ **4.5:1** (≥3:1 for large text).

> **Notes** — Reference measures ≥8.4:1 throughout. Verify **composited** values — the disclaimer sits on `rgba(0,0,0,0.7)` over photography, so compute against the blend, not the declared colour.

---

#### C3 — Selected-state indicators ≥3:1

`SC 1.4.11`

Selected-state indicators ≥ **3:1**.

> **Notes** — Selected swatch border `#997F67` = 3.76:1.

---

#### C4 — Every target ≥24×24 CSS px

`SC 2.5.8`

Every target ≥ **24×24** CSS px.

> **Notes** — Smallest in the reference is the close button at exactly 24×24. Scroll-arrows 28, touch controls 32, swatches 48.


**The exception, and where the reference depends on it.** 24×24 is the rule, but 2.5.8 permits
exceptions — spacing, equivalent control, inline, user-agent-controlled, essential.

The spacing test is easy to get wrong. It is **not** "centres ≥24px apart" — that variant applies
only when *both* neighbours are undersized. Against a **full-size** neighbour the test is: a
24px-diameter circle centred on the undersized target must not intersect that neighbour's **box**,
i.e. **≥12px clearance from centre to box edge**.

`#label-wheel` (a `<span role="button">`, **17px tall**) passes on this exception alone:

| Viewport | Clearance to `.btn-swatch` | Required | Headroom |
|---|---|---|---|
| 1440 / 390 / 320 | 20.4px | ≥12px | **8.4px** |
| 768 | 122px | ≥12px | large |

That spacing is **load-bearing** — remove ~8px and it becomes a real AA failure with no exception
left. **Do not inherit the dependency:** ship a native `<button>` sized ≥24×24.
---

#### C5 — No content loss at 320×256

`SC 1.4.10`

No horizontal scrolling / content loss at **320×256** CSS px.

> **Notes** — Verified at 1× emulation. Sufficient techniques: **C31** (flexbox), **C32** (media queries + grid), **C34** (un-fix sticky elements).

---

#### C6 — Focused control not behind fixed bars

`SC **2.4.11**`

A focused viewer control must not end up **behind the page's fixed bars**. Reserve clearance with `scroll-padding-top` / `scroll-padding-bottom` on the scroll container.

> **Notes** — The browser scrolls a focused control into the *layout* viewport and considers that done — it has no idea a `position:fixed` header or action bar is painted on top. `#btn-toggle-view` landed **entirely** behind the bottom bar, 0 of 5 test points visible. The clearance values must track the real bar heights per breakpoint. This is a page-chrome interaction, but the control that disappears is the viewer's, so it is the viewer's problem to verify.

---

#### C7 — Scrollable regions are keyboard reachable

`SC 2.1.1`

A control that scrolls (the spec panel's text block) needs `tabindex="0"`.

> **Notes** — Making it scrollable to satisfy C5 **created** a violation: a scrollable region must be keyboard-scrollable (ACT rule `0ssw9k`). Fixing one criterion opened another — re-run the full check after any overflow change, not just the criterion you were working on.

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

## Coverage — every WCAG 2.2 A/AA criterion

WCAG 2.2 has **87** criteria: 31 A · 24 AA · 31 AAA, plus the obsolete 4.1.1.
**The 31 AAA criteria are out of scope for an AA target** — so if you are looking for
something like 1.2.9 Audio-only (Live), that is AAA and does not apply here.

| Status | Count | Meaning |
|---|---|---|
| ✅ Verified | **23** | driven or measured evidence |
| ✅ Inspected | **9** | code / accessibility-tree inspection, not driven |
| ⚪ N/A | **16** | no such content in the component |
| ⚖️ Judgement call | **2** | passes, but on an arguable reading |
| ⚠️ Not assessed | **6** | honestly unknown — do not assume a pass |
| ❌ **Fail** | **0** | no known failures |

## The 8 that need a decision or a person

Everything else is settled. These are not:

| SC | Lvl | Name | Status | What is needed |
|---|---|---|---|---|
| **1.3.4** | AA | Orientation | ⚠️ Not assessed | **Component.** Fullscreen applies `rotate(90deg)`; confirm content is not *restricted* to one orientation. |
| **1.4.12** | AA | Text Spacing | ⚠️ Not assessed | **Component.** Apply the four text-spacing overrides and confirm no clipping or overlap. |
| **2.4.5** | AA | Multiple Ways | ⚠️ Not assessed | *Page-level.* Needs the real IA, not one page. |
| **2.5.3** | A | Label in Name | ⚖️ Judgement call | Decide whether to keep `aria-label` over a value-display span — see **A9**. |
| **2.5.8** | AA | Target Size (Minimum) | ⚖️ Judgement call | Passes on the spacing exception with 8.4px headroom — see **C4**. |
| **3.2.3** | AA | Consistent Navigation | ⚠️ Not assessed | *Page-level.* Needs a second page to compare against. |
| **3.2.4** | AA | Consistent Identification | ⚠️ Not assessed | *Page-level.* Needs a second page to compare against. |
| **3.2.6** | A | Consistent Help | ⚠️ Not assessed | *Page-level.* Where the help mechanism sits across pages. |

> **Only two are yours.** 1.3.4 and 1.4.12 belong to the Visualizer team. The four
> page-level criteria belong to whoever owns the page template — assign them there, not here.
> The two judgement calls are decisions to record, not work to do.

Plus the standing **method** gap, which is not a criterion: **no real screen-reader testing**
(Definition of Done, item 6).

## Full table — all 56 rows

<details>
<summary>Expand: every A/AA criterion with applicability, status and evidence</summary>

| SC | Lvl | Name | Status | Evidence / reason |
|---|---|---|---|---|
| **1.1.1** | A | Non-text Content | ✅ Verified | axe `image-alt` / `svg-img-alt` clean at 5 viewports; AX tree 0 unnamed interactive, 26 graphics named; swatch `alt` set as a property (B1). |
| **1.2.1** | A | Audio-only and Video-only (Prerecorded) | ⚪ N/A | No `<audio>`, `<video>` or `<iframe>`. The interior panorama is a `<canvas>`, not media. |
| **1.2.2** | A | Captions (Prerecorded) | ⚪ N/A | No prerecorded media. |
| **1.2.3** | A | Audio Description or Media Alternative (Prerecorded) | ⚪ N/A | No prerecorded media. |
| **1.2.4** | AA | Captions (Live) | ⚪ N/A | No live media. |
| **1.2.5** | AA | Audio Description (Prerecorded) | ⚪ N/A | No prerecorded video. |
| **1.3.1** | A | Info and Relationships | ✅ Verified | axe 0 violations across all structure rules (`aria-*`, `list`, `heading-order`); `role="radiogroup"` + 18 radios exposed correctly in the AX tree. |
| **1.3.2** | A | Meaningful Sequence | ✅ Inspected | DOM order matches visual order; real Tab sweep gives 34 coherent stops at 390 and 320. |
| **1.3.3** | A | Sensory Characteristics | ✅ Inspected | Instructions are textual — `#media-help` says "Use the left and right arrow keys…", not "the control on the right". |
| **1.3.4** | AA | Orientation | ⚠️ Not assessed | **Not assessed.** Fullscreen applies `rotate(90deg)` to the component. Needs an explicit check that content is not *restricted* to one orientation. |
| **1.3.5** | AA | Identify Input Purpose | ⚪ N/A | No fields collecting information about the user; the single `<select>` is a product choice, not autocomplete-eligible. |
| **1.4.1** | A | Use of Color | ✅ Inspected | Selection is conveyed by a checkmark badge and `aria-checked`, not colour alone; every swatch also carries its name. |
| **1.4.2** | A | Audio Control | ⚪ N/A | No audio. |
| **1.4.3** | AA | Contrast (Minimum) | ✅ Verified | Every axe *needs-review* contrast node resolved on composited pixels: **23/23 pass, 8.59:1 – 21.00:1** at 1440 / 390 / 320@400%. |
| **1.4.4** | AA | Resize Text | ✅ Verified | Literal 400% zoom (320x256 @ dsf 4): axe 0 violations, no horizontal scroll, no clipped text. |
| **1.4.5** | AA | Images of Text | ✅ Inspected | All text is real text; car and wheel imagery is photographic, not images of text. |
| **1.4.10** | AA | Reflow | ✅ Verified | No horizontal scroll at 320 / 390 / 768 / 1440 or at 400% zoom. Swatch strips judged bounded sub-widgets (Part G). |
| **1.4.11** | AA | Non-text Contrast | ✅ Verified | Focus ring measured under a real hover: navy on tan = **8.61:1** in hover and active; 3.75:1 default on white. C1. |
| **1.4.12** | AA | Text Spacing | ⚠️ Not assessed | **Not assessed.** Requires applying the four text-spacing overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) and confirming no content loss. |
| **1.4.13** | AA | Content on Hover or Focus | ✅ Inspected | Hover/focus changes are background and outline only — no popups or tooltips that must be dismissible, hoverable and persistent. |
| **2.1.1** | A | Keyboard | ✅ Verified | Full keyboard operation driven: rotate (arrows), pan/tilt in interior, zoom (Enter **and** Space), open/close panel, stop auto-rotation. B4, B5, B7. |
| **2.1.2** | A | No Keyboard Trap | ✅ Verified | Tab sweep reaches 34 stops and exits; Escape closes the panel from anywhere. No trap. |
| **2.1.4** | A | Character Key Shortcuts | ⚪ N/A | No single-character shortcuts. Bindings are arrows, Enter, Space and Escape, all on a focused widget. |
| **2.2.1** | A | Timing Adjustable | ⚪ N/A | No time limits. |
| **2.2.2** | A | Pause, Stop, Hide | ✅ Verified | Interior auto-rotation stoppable **by keyboard alone** — canvas hash frozen after `ArrowLeft`, mouse never used. B4. |
| **2.3.1** | A | Three Flashes or Below Threshold | ✅ Inspected | No flashing content; animation is transforms and opacity only. |
| **2.4.1** | A | Bypass Blocks | ✅ Inspected | Skip link present; `role="main"` on the content region. |
| **2.4.2** | A | Page Titled | ✅ Verified | axe `document-title` clean; page titled. |
| **2.4.3** | A | Focus Order | ✅ Verified | Panel open moves focus in; close returns to **whoever opened it** — trigger if a user did, viewer if it auto-opened. Escape from outside does not move focus. B6, B13. |
| **2.4.4** | A | Link Purpose (In Context) | ✅ Verified | AX tree: 0 unnamed links, 0 duplicate role+name pairs across 394 nodes. |
| **2.4.5** | AA | Multiple Ways | ⚠️ Not assessed | **Not assessed** — site-level criterion; cannot be judged from a single prototype page. |
| **2.4.6** | AA | Headings and Labels | ✅ Verified | One `h1`, two `h2`, axe `heading-order` clean; every control has an accessible name. |
| **2.4.7** | AA | Focus Visible | ✅ Verified | Real Tab sweep: 34 stops, **0 invisible**. Ring contrast verified in default, hover and active. C1. |
| **2.4.11** | AA | Focus Not Obscured (Minimum) | ✅ Verified | After the *browser* scrolls each control into view: **20/20** controls fully visible at 1440/390/320, **zero fixed or sticky occluders**. C6. |
| **2.5.1** | A | Pointer Gestures | ✅ Verified | Drag-rotation has single-pointer alternatives: `#btn-rot-left` / `#btn-rot-right` plus arrow keys. No path-based gesture required. |
| **2.5.2** | A | Pointer Cancellation | ✅ Verified | Swatch arrows fire on **pointer-up**; press-then-drag-off-then-release leaves scrollLeft at 0, so the action is abortable. B3. |
| **2.5.3** | A | Label in Name | ⚖️ Judgement call | **Judgement call.** `#select-model-lg` has `aria-label="Select model"` while the adjacent `<span class="select-label">` displays the *value* ("ID.7"). W3C: *"where a visible text label does not exist for a component, this success criterion does not apply"* — a value display is not a label, so it passes. But the element is **named** `select-label`, and a speech user saying "ID.7" would miss the control. Safer: point `aria-labelledby` at a real visible label. **No tool checks this — axe has no `label-in-name` rule**, and a sibling VW prototype had a genuine 2.5.3 failure found only by hand. |
| **2.5.4** | A | Motion Actuation | ⚪ N/A | No device-motion or user-motion actuation. |
| **2.5.7** | AA | Dragging Movements | ✅ Verified | Rotation and panning achievable without dragging — rotate/tilt buttons and arrow keys. |
| **2.5.8** | AA | Target Size (Minimum) | ⚖️ Judgement call | **Passes via the spacing exception only.** `#label-wheel` is 17px tall; circle-to-box clearance to `.btn-swatch` is **20.4px** against a 12px requirement — **8.4px headroom**. Spacing is load-bearing; ship a native >= 24x24 `<button>` instead. See **C4**. |
| **3.1.1** | A | Language of Page | ✅ Verified | `<html lang="en">`; axe `html-has-lang` clean. |
| **3.1.2** | AA | Language of Parts | ✅ Verified | `lang="de"` on `#grid-wheel` and `#label-wheel`; the German wheel names inherit it. |
| **3.2.1** | A | On Focus | ✅ Inspected | Focus causes no context change. Swatch focus scrolls the strip into view (2.4.11 support) — scrolling is not a change of context. |
| **3.2.2** | A | On Input | ✅ Inspected | Changing the model `<select>` updates the same view in place; no new window, no focus jump. |
| **3.2.3** | AA | Consistent Navigation | ⚠️ Not assessed | **Not assessed** — multi-page criterion. |
| **3.2.4** | AA | Consistent Identification | ⚠️ Not assessed | **Not assessed** across pages; consistent within this page. |
| **3.2.6** | A | Consistent Help | ⚠️ Not assessed | **Not assessed** — site-level (where the help mechanism sits across pages). |
| **3.3.1** | A | Error Identification | ⚪ N/A | No user input that can be in error. |
| **3.3.2** | A | Labels or Instructions | ✅ Verified | The `<select>` is named; `#media-help` supplies keyboard instructions and is rewritten per mode (B12). |
| **3.3.3** | AA | Error Suggestion | ⚪ N/A | No error conditions. |
| **3.3.4** | AA | Error Prevention — Legal, Financial, Data | ⚪ N/A | No legal, financial or data-modifying submission. |
| **3.3.7** | A | Redundant Entry | ⚪ N/A | No multi-step process requiring re-entry. |
| **3.3.8** | AA | Accessible Authentication (Minimum) | ⚪ N/A | No authentication. |
| **4.1.1** | A | Parsing | ⚪ N/A | **Obsolete — removed from WCAG 2.2.** Listed for completeness only. |
| **4.1.2** | A | Name, Role, Value | ✅ Verified | AX tree: 394 nodes, **0 unnamed interactive**, **0 duplicate role+name**. 18 radios / 18 unique names with German quotes intact (the original Level A bug). |
| **4.1.3** | AA | Status Messages | ✅ Verified | `#media-status` announces "Zoomed in"/"Zoomed out" on **all 8** zoom paths, `disabled` derived from state. B5. |

</details>

---

## Definition of Done

- [ ] **1 · Accessibility tree** dump of the component subtree — every interactive node has a
      **non-empty, unique** accessible name. *(DevTools → Accessibility pane, or CDP
      `Accessibility.getFullAXTree`.)*
- [ ] **2 · Real keyboard run** — Tab / Shift+Tab / Enter / Space / Arrows / Escape, asserting
      `document.activeElement` at each step. Focus must never land on an invisible control, and
      never be lost to `<body>` when a panel closes.
- [ ] **3 · Reflow** at 320×256 CSS px — nothing lost, no horizontal page scroll.
- [ ] **4 · Contrast** measured on **composited** pixels wherever text sits over imagery or a
      gradient. The declared CSS colour is not sufficient.
- [ ] **5 · SC 2.5.3** — visible label contained in the accessible name, for every labelled
      control. No tool does this; check it by hand.
- [ ] **6 · Screen reader** — one pass with NVDA or VoiceOver. **Not optional:** the accessibility
      tree shows what is *exposed*, not what is *announced*.
- [ ] **7 · CI** — `jest-axe` for the structural half; Playwright with real key presses plus
      `expect(page.locator(':focus'))` for the behavioural half. Both are needed to prevent
      regression.

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

**B3** · `SC 2.5.2`

At 390 **and** 320 (the only widths where the swatch row overflows): `scrollLeft` 0 → **unchanged on pointer-down** → 180 on pointer-up. Press-then-drag-off-then-release leaves it at **0**, so the action is genuinely abortable.

---

**B4** · `SC 2.2.2`

Interior panorama canvas hash changes while auto-rotating, then is **identical across two samples after a keyboard `ArrowLeft`** — stopped by keyboard alone, mouse never used.

---

**B5** · `SC 4.1.3`

All **8** zoom paths in sync (pointer in/out, button in/out, Enter in/out, Space in/out): `disabled` flags mirror state and `#media-status` reads "Zoomed in"/"Zoomed out" every time.

---

**B6** · `SC 2.4.3`

Open → focus `#btn-close`, `aria-expanded=true`; close → focus back to `#btn-info`, `aria-expanded=false`.

---

**B13** · `SC 2.4.3`

Auto-opened panel closed with Escape → focus lands on **`media`**, not the trigger. Escape pressed while focus is *outside* the panel closes it and **does not move focus at all**.

---

**C1** · `SC 1.4.11, 2.4.7`

Ring measured under a **real** hover (`:hover` asserted true, not assumed): navy `#1B2236` on the tan fill = **8.61:1** in both hover and active.

---

**C6** · `SC 2.4.11`

After the *browser* scrolls each control into view: **20/20** applicable controls fully visible at 1440/390/320, **zero fixed or sticky occluders**. `scroll-padding` resolves to 120/84 (desktop) and 116/96 (narrow).

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

**SC 2.5.8 target size — one exception relied upon.** `#label-wheel` is 17px tall, so it does not
meet the 24x24 minimum. **It still passes 2.5.8, via the spacing exception** — verified with the
correct geometry at 1440 / 768 / 390 / 320.

The exception is *not* "centres 24px apart". The normative test is: a **24px-diameter circle centred
on the undersized target's bounding box** must not intersect **another target** (that neighbour's
actual box, when the neighbour is full-size) or **the circle of another undersized target** (centres
>= 24px apart). `#label-wheel`'s nearest neighbour is `.btn-swatch`, which is full-size, so the
binding test is **circle-to-box**:

| Viewport | Nearest full-size target | Centre → its box | Required | Headroom |
|---|---|---|---|---|
| 1440 | `.btn-swatch` | **20.4px** | >= 12px (circle radius) | 8.4px |
| 768 | `.btn-swatch` | 122px | >= 12px | large |
| 390 | `.btn-swatch` | **20.4px** | >= 12px | 8.4px |
| 320 | `.btn-swatch` | **20.4px** | >= 12px | 8.4px |

It is the **only** undersized target at any of the four widths, and it passes at all of them.

**But the margin is 8.4px, not 24px.** Removing roughly 8px of vertical breathing room between the
wheel label and the swatch row turns a pass into a genuine AA failure with no exception left.
Treat the spacing around this element as load-bearing, and prefer fixing the root cause: it is a
`<span role="button" tabindex="0">` rather than a native button — named and fully keyboard-operable
(Enter / Space / Escape, with `preventDefault`) — so shipping it as a real `<button>` with a >= 24px
target removes the dependency entirely.

*(An earlier draft of this record cited "48px centre-to-centre". That is the wrong measurement for a
full-size neighbour — it compares centres when the spec compares the circle against the neighbour's
box edge. The conclusion is unchanged; the true clearance is 20.4px.)*

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

## Appendix — habits in the current live build

`volkswagen.de/de/modelle/id-polo.html` is the **old** design and is being replaced, so these are
**not defects to fix**. They are listed because they show patterns likely to carry into the new
build. Captured from the live accessibility tree, 2026-08-16.

| Observed | Maps to |
|---|---|
| `Menu_ChangeColor` — visible "Farben", name "Farbauswahl anzeigen"; `Menu_OpenInterior` — visible "Innenraum", name "Interieur anzeigen". 2 of 3 fail. | **R12** |
| 6 colour swatches as ungrouped `<button>`s, container `role: null`, selection via `aria-current` | **R4**, **R3** |
| `aria-label="Active color: Pythongelb Metallic"` on `<html lang="de">` | **R11** |

**Already correct today — do not regress:** zoom controls are real `<button>`s with German labels,
and `Zoom_Out` correctly carries `disabled` at minimum zoom.

---

## Source of truth

Criterion wording, Intent, Benefits, Examples, Techniques and ACT Rules for all 56 A/AA criteria:
`~/Documents/j-vault/md/wcag22-full-reference.md` — verbatim from W3C, diffed against the normative
spec (87/87 criteria, 0 level mismatches, 0.998 mean text fidelity on quoted normative text).
