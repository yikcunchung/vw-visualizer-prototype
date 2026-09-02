# A11y 3 of 3 — What to build

**Component:** `#visualizer` (`#media` + `#bottombar`) on vw.com — AEM + React SPA Editor + styled-components.  
**Companions:** `a11y-1-criteria.md` (criteria, pass/fail) · `a11y-2-automated-testing.md` (what tools can and cannot prove).

**How to read this:** sections 1–6 are **prescriptive** — they are the contract the port
must meet, not a description of the current build. Sections 9–10 are **descriptive** —
what the reference build measurably does today, for diffing against.

**Scope:** Everything here applies to the `#visualizer` subtree. All tracked elements sit inside `#visualizer`. Page chrome (nav, hero, tiles, footer) is out of scope.

**BLUF:** Implement the visualizer so keyboard, screen‑reader and pointer users can operate it safely.  
Treat the vanilla reference as a behavioural spec, **not** as DOM to copy: roughly half of the required behaviour lives in JavaScript. Copying markup and rewriting logic will silently drop it.

---

## Start here — the four bugs that actually shipped

Each of these was a real defect; **no tool** (axe, Lighthouse, WAVE) caught any of them.

| Rule | What went wrong | Cost if missed |
|---|---|---|
| **SC 2.1.1** | `mousedown preventDefault()` to stop image drag also suppressed focus, so `activeElement` stayed `<body>` and all `active === viewer` guards failed. | Two shipped bugs: pointer users could not rotate; tap zoomed in while Enter/Space could not zoom out. |
| **SC 4.1.2, 1.1.1** | Product names containing `"` built as `alt="${name}"` truncated at the quote; five wheel radios shared one accessible name. | Level A failure, passed axe, Lighthouse and WAVE because names existed and were unique syntactically. |
| **SC 2.5.3** | Visible label text did not appear in the accessible name. | Level A failure; axe has no rule for it. A sibling VW project shipped this. |
| **SC 2.4.3** | Panel unmounted while focus was inside; focus fell back to `<body>` instead of returning to content or trigger. | Silent focus loss in React via wrong effect dependency; screen‑reader users get “nowhere” when the panel closes. |

Habit worth keeping: **a name being present and unique does not make it correct.** Check swatch names against the actual colour or material; no engine has a rule for “wrong but non‑empty” names.

---

# 1. Semantics and naming

What assistive tech is told the interface *is*. If roles/names are wrong, the description diverges from what’s on screen.

### SC 4.1.2 — Viewer container is a region

The viewer container is `role="region"` with `aria-label` and `aria-roledescription="car 360° viewer"`, and is focusable (`tabIndex={0}`) for arrow‑key rotation and zoom.

```jsx
<div
  role="region"
  aria-label="Car viewer"
  aria-roledescription="car 360° viewer"
  tabIndex={0}
>
```

Avoid wrapping multiple buttons in a `button` role — that polluted the accessible name and created nested interactive controls in the reference.

### SC 1.3.1, 4.1.2 — Swatch groups are radiogroups

Each swatch group owns its radios and exposes them as a single `radiogroup` labelled by its visible title.

```jsx
<div role="radiogroup" aria-labelledby="title-colour">
  <span id="title-colour">Farben</span>
  {colours.map((c, i) => (
    <button
      role="radio"
      aria-checked={i === sel}
      key={c.code}
    >
      …
    </button>
  ))}
</div>
```

AEM risk: authoring wrappers (`EditableComponent`) must not break the radiogroup’s ownership of its radios; keep the group as one component or wire `aria-owns`.

### SC 4.1.2 — Spec panel is a named dialog

The spec/disclaimer panel is `role="dialog"` with an accessible name; use `aria-modal="false"` for non‑modal, and do not set `aria-modal="true"` without a focus trap.

```jsx
<div role="dialog" aria-labelledby="spec-title" aria-modal="false">
```

### SC 4.1.2, 1.1.1 — Never interpolate alt text into markup

Alt text is set as a property/prop, not interpolated into HTML strings.

```jsx
// Bad: quote closes the attribute early, collapsing names.
el.innerHTML = `<img alt="${name}">`;

// Good: JSX or direct property.
<img alt={name} />
img.alt = name;
```

The reference once truncated wheel names at embedded `"` and collapsed five distinct radios into one accessible name.

### SC 4.1.2 — Selection state derives from state

Selection ARIA attributes derive directly from component state, so they cannot desync from visuals.

```jsx
<button role="radio" aria-checked={i === selected}>
```

Avoid imperative class toggles without matching ARIA updates.

### SC 2.5.3 — Visible label sits inside the accessible name

If a control has a visible text label, its accessible name contains that text. Names describe **purpose** and stay stable; values describe **state** and change.

```jsx
<button aria-label="Innenraum anzeigen">
  Innenraum
</button>
```

Do **not** let a value-mutation drag the purpose-describing part of a name along with it — a name like `ID.7 Select car model`, rewritten wholesale on every change, conflates name with value in one unstable string. `#select-model-lg`'s name legitimately includes the current family ("Model: ID.7" -> "Model: Grand California"), but the purpose-describing "Model:" half lives in its own element that nothing ever rewrites, so only the value half moves.

### SC 3.1.2 — Passages in another language carry `lang`

Any text not in the page language carries `lang` so screen readers switch pronunciation correctly.

```jsx
<span lang={locale}>{name}</span>
```

Drive `lang` from content locale, not hardcoded strings. Keep long, realistic fixture strings — several bugs surfaced only because names were long and awkward.

### SC 1.1.1 — Decorative icons are aria-hidden

Decorative icons and SVGs are hidden from the accessibility tree.

```jsx
<Icon aria-hidden="true" />
```

Set `aria-hidden="true"` inside the icon component so all consumers inherit it.

### SC 4.1.2 — Icon-only buttons: aria-label, no duplicate title

Icon‑only buttons expose a meaningful `aria-label` and omit redundant `title` with the same text (WAVE reports this as noise).

```jsx
<button aria-label="Rotate view">
  <RotateIcon aria-hidden="true" />
</button>
```

---

# 2. Keyboard and focus

Roughly half of this component’s accessibility; most of it is invisible to scanners.

### SC 2.1.1 — Arrow keys have two scopes

Left/Right act when the viewer has focus **or when nothing does** (`media`, `document.body`, `null`); Up/Down act **only** when the viewer itself has focus.

```jsx
onPointerDown={e => {
  if (e.target.closest('button')) return;
  ref.current?.focus({ preventScroll: true });
}}
```

This lets pointer users rotate without explicit focus while keeping page‑scroll keys (Up/Down, Space) for the page when nothing is focused.

### SC 2.4.3 — Panel opening and closing manage focus

Opening the spec panel moves focus into the content region; closing returns focus to the correct place:

- If the user opened it via the info button, focus returns to the trigger.  
- If it auto‑opened on scroll, focus returns to the viewer, not a button the user never pressed.

Guard on `panel.contains(document.activeElement)` before moving focus so `Escape` from elsewhere does not yank focus across the page.

In React, prefer keeping the panel mounted and hidden rather than conditionally rendering it; unmounting a focused node drops focus to `<body>`.

### SC 2.4.7 — Hidden controls leave the tab order

Hidden or non‑functional controls are removed from the tab order (`disabled`) instead of merely visually hidden.

```jsx
<button disabled={!visible}>
  …
</button>
```

Avoid `opacity:0` / `pointer-events:none` on focusable elements; they produce invisible, dead tab stops.

### SC 4.1.2 — Inactive groups are inert, not just hidden

Inactive control groups are inert to AT as well as visually hidden (browser support via `inert`, polyfilled where necessary).

```jsx
<fieldset inert={!active}>
  …
</fieldset>
```

Use refs if pinned React does not support `inert` as a prop yet.

### SC 2.2.2 — Auto-rotation stoppable by keyboard

Auto‑rotation (interior panorama) stops on keyboard interaction, not just mouse.

```jsx
useEffect(() => {
  const id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}, [deps]);

onKeyDown={e => {
  if (isArrow(e.key)) {
    stopAutoRotate();
    pan(e.key);
  }
}}
```

Bind `stopAutoRotate()` to arrow keys and any rotate/tilt control; keyboard users must be able to stop motion that was started on their behalf.

### SC 4.1.2 — Expand control exists only when there is something to expand

Wheel label is a button **only while text is actually truncated**. Derive role, `tabIndex` and `aria-expanded` from measured overflow.

```jsx
const ref = useRef(null);
const [truncated, setTruncated] = useState(false);

useLayoutEffect(() => {
  const el = ref.current;
  if (!el) return;
  const measure = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(el);
  return () => ro.disconnect();
}, [name]);

<span
  ref={ref}
  role={truncated ? 'button' : undefined}
  tabIndex={truncated ? 0 : undefined}
  aria-expanded={truncated ? open : undefined}
>
  {name}
</span>
```

At widths where the name fits, the label has **no role**, is **not tabbable**, and does nothing when clicked.

### SC 2.4.3 — List keys stable across filtering

List `key`s remain stable across filtering so React does not remount swatches and throw focus to `<body>` mid keyboard navigation.

```jsx
{items.map(item => (
  <Swatch key={item.id} … />
))}
```

Avoid index‑based keys on filtered lists.

### SC 1.3.1 — Keyboard description accurate and present

The viewer carries `aria-describedby` pointing at a visually hidden element that describes keyboard operation, and that description is kept in sync with actual bindings.

```jsx
<div
  role="region"
  aria-label="Car viewer"
  aria-roledescription="car 360° viewer"
  aria-describedby="viewer-kbd-help"
  tabIndex={0}
>
  …
</div>

<p id="viewer-kbd-help" className="sr-only">
  {mode === 'exterior'
    ? 'Use Left and Right arrows to rotate, or the accessibility buttons.'
    : 'Use Left, Right, Up and Down arrows to pan, or the accessibility buttons.'}
</p>
```

Do not rely on transient, visually‑only hints like “Drag to rotate” that are `aria-hidden` and fade out.

---

# 3. Pointer and targets

Touch, mouse and assistive pointing devices.

### SC 2.5.2 — Pointer actions fire on the up-event

Single‑pointer actions (clicks, taps) fire on **up‑event**, not down‑event, so users can abort by dragging away.

```jsx
<button onPointerUp={scroll}>
  …
</button>
```

Only controls that emulate a keyboard key press are allowed to use down‑event.

### SC 2.5.7 — Drag has a non-drag alternative

Drag‑to‑rotate has a single‑pointer, non‑drag alternative: rotate/tilt buttons and arrow keys.

```jsx
<button aria-label="Rotate left" onClick={() => pan('ArrowLeft')} />
<button aria-label="Rotate right" onClick={() => pan('ArrowRight')} />
```

Reaching a view angle is endpoint‑based, so no drag‑only exemption applies.

### SC 2.5.8 — Every target ≥24×24 CSS px

Targets are at least 24×24 CSS px. If one must be smaller, spacing exceptions are applied and recorded against real measurements.

- Close button: 24×24.  
- Scroll arrows: ≥28×28.  
- Touch controls: ≥32×32.  
- Swatches: ≥48×48.  
- Wheel label: ~26px tall via line‑height + padding.

Enable axe’s `target-size` rule explicitly; it is off by default and will otherwise report “0 violations” without testing target size.

---

# 4. Visual

Contrast, focus indication, and layout under constrained viewports.

### SC 1.4.11, 2.4.7 — Focus indicator ≥3:1

Every interactive control has a focus indicator with ≥3:1 contrast against adjacent background in all states (rest, hover, active).

Use component‑level styles (props) instead of ID‑specific CSS so styled‑components can express state reliably.

### SC 1.4.3 — Text and icon contrast ≥4.5:1

Text and icons have ≥4.5:1 contrast (≥3:1 for large text). Measure against **composited** backgrounds (e.g. text over `rgba(0,0,0,0.7)` on photography) rather than declared colours.

### SC 1.4.11 — Selected-state indicators ≥3:1

Selected swatch indicators (e.g. borders) have ≥3:1 contrast against surroundings.

### SC 2.4.11 — Focused control not behind fixed bars

No focused viewer control ends up behind fixed page headers/footers; use `scroll-padding-top` / `scroll-padding-bottom` on the scroll container to reserve clearance.

```css
.scroll-container {
  scroll-padding-top: var(--header-height);
  scroll-padding-bottom: var(--bottom-bar-height);
}
```

Track actual bar heights per breakpoint; verify with tabbing and `document.activeElement`.

**Swatch strips need a second, separate mechanism** — `scroll-padding` doesn't help here, because the occluder isn't a fixed page bar, it's the strip's own floating scroll-arrow overlay at the edge of a horizontally-scrolling container. The browser's default focus scroll-into-view only scrolls the minimum distance needed, which parks a Tab-focused swatch right at that edge, under the arrow. Fix: explicitly re-center the focused swatch instead of relying on the default.

```js
btn.addEventListener('focus', () => scrollSwatchIntoView(btn.parentElement, idx));
// scrollSwatchIntoView centers the target swatch in the visible strip;
// already fires on click for the selected swatch — wire it to focus too.
```

Verify by tabbing to an off-screen swatch and confirming it lands centered, not pinned under the arrow — clicking to select was never the gap, only keyboard focus was.

### SC 1.4.10 — No content loss at 320×256

At 320×256 CSS px (e.g. 400% zoom on small device), content reflows without causing horizontal scroll or clipping.

Use flex/grid + media queries to adapt layout; avoid fixed positioning that traps content off‑screen.

**Two selectors sharing one row need an explicit width-allocation rule, not just flex-wrap.**
`updateBBConstraint()` measures each section's natural width (swatch content vs. header minimum,
whichever is larger), then — only if both together exceed the panel's available width — allocates
smallest-natural-width first: each section gets `min(its own natural width, an equal share of
what's left)`. Processed in that order, the smaller selector reliably gets its full natural width,
and the larger selector absorbs any shortfall by scrolling its own swatch strip (`overflow-x: auto`)
instead of the whole panel spilling past the viewport. This is what keeps the page-level guarantee —
no panel ever exceeds `media.clientWidth` — true even when the two selectors have very different
swatch counts. No automated test covers this allocation logic yet.

### SC 2.1.1 — Scrollable regions keyboard reachable

Scrollable regions (e.g. disclaimer text block) are keyboard reachable.

```jsx
<div tabIndex={0} className="scrollable-text">
  …
</div>
```

Making a region scrollable to satisfy reflow criteria also creates this keyboard obligation.

---

# 5. Announcements

State changes that are not focus changes.

### SC 4.1.3 — Visually hidden polite live region

A visually hidden `aria-live="polite"` region exists for status announcements.

```jsx
<span className="sr-only" aria-live="polite">
  {zoomed ? 'Zoomed in' : 'Zoomed out'}
</span>
```

Use `.sr-only` clipping (1×1 px, off‑screen), **not** `display:none`.

### SC 4.1.3 — Zoom announces and syncs on every path

Zoom state announces and keeps dependent controls (zoom in/out buttons) in sync on all paths: pointer tap, keyboard, accessibility buttons.

```jsx
const zoomed = zoomLevel > 1;

<button
  aria-label="Zoom out"
  disabled={!zoomed}
  onClick={zoomOut}
>
  …
</button>

<span className="sr-only" aria-live="polite">
  {zoomed ? 'Zoomed in' : 'Zoomed out'}
</span>
```

Derive `disabled` and announcements from state, not from individual event handlers.

---

# 6. React, styled-components and AEM — seven traps to watch

1. **Authoring wrappers vs `radiogroup` ownership** — AEM’s `EditableComponent` cannot break radiogroup → radio ownership (see SC 1.3.1, 4.1.2 above).  
2. **ID‑specific CSS focus styles** — rewrite focus/selection styles as component props; styled‑components cannot rely on IDs.  
3. **Global `:focus-visible` conflicts** — a global rule may not beat component styles; scope focus styles per component.  
4. **Conditional rendering vs focus** — unmounting panels while focused drops focus to `<body>` (see SC 2.4.3 above).  
5. **rAF cleanup** — cancel requestAnimationFrame on unmount and on interaction (see SC 2.2.2 above).  
6. **`dangerouslySetInnerHTML`** — only route back to SC 4.1.2, 1.1.1 above; avoid string‑built HTML with interpolated alt text.  
7. **Unstable keys** — index keys on filtered lists remount swatches and throw focus away (see SC 2.4.3 above).

---

# 7. Definition of Done

A green CI run does not close this. The reference passed axe, Lighthouse **and** WAVE while
containing Level A failures.

- [x] **Accessibility tree** — 158 nodes in the component subtree, **0 unnamed, 0 duplicate
      role+name**, 18 radios with 18 unique names. Confirmed again in announced output: the
      VoiceOver rotor listed all 18 swatches with no blank and no duplicate.
- [x] **Real keyboard run** — Tab / Shift+Tab / Enter / Space / Arrows / Escape, asserting
      `document.activeElement` at each step. Focus never lands on an invisible control and is
      never lost to `<body>` when a panel closes.
- [x] **Reflow** at 320×256 CSS px (`deviceScaleFactor 4` = literal 400% zoom) — 0 violations,
      no horizontal scroll, 12 tab stops (exterior, `#btn-a11y` collapsed — see §10.4) with 0
      landing on an invisible control.
- [x] **Contrast** measured on **composited** pixels wherever text sits over imagery or a
      gradient — 8.59:1 to 21:1, every `incomplete` node resolved by hand.
- [x] **SC 2.5.3** by hand — no tool does this. `#select-model-lg` is named via
      `aria-labelledby` from two spans inside its own floating-label slot: a static "Model:"
      prefix and the pre-existing family value span. See `a11y-1-criteria.md`.
- [x] **Names are correct**, not merely present and unique — all 18 swatch names read aloud and
      checked against the thing they describe, quotes and diacritics intact.
      ⚠️ **Carries forward:** the interior materials are placeholders fed from JSON in
      production, so this check moves to the **data layer** — assert non-empty, unique within
      the group, and actually descriptive. No engine has a rule for a name that is wrong.
- [x] **Screen reader** — VoiceOver, all fifteen checks, Safari and Chrome. It found a defect no
      tool reports: the disclaimer opened focus past its own text. ⚠️ **NVDA 2026.1.1.55980 is
      still owed** — the protocol names it, and VoiceOver is a deviation, not a substitution.
- [x] **CI** — built: `npm test` runs Playwright over four viewports (1440, 768, 390, and
      320x256 @ dsf 4), on every push and PR via `.github/workflows/a11y.yml`. **92 tests,
      all passing — verified green on GitHub Actions.**
      *Deviation, deliberate:* the structural half runs axe **inside Playwright** rather than
      `jest-axe`. `jest-axe` runs in jsdom, and jsdom cannot run this component at all — init
      is gated on an `IntersectionObserver`, the interior view is a `<canvas>` panorama, and
      both `target-size` and the `#label-wheel` truncation rule need real layout. Same rules,
      a browser that actually built the thing, no false green.
- [x] **`target-size` explicitly enabled** in the axe config — it is off by default, so without
      this line CI passes SC 2.5.8 without ever testing it.
- [x] **The suite fails when it should** — validated by injecting each defect back and
      confirming the matching test goes red: `aria-expanded` removed from the auto-open path
      (1 fail), `announceRotation()` removed from `stepRight` (1 fail), `wireRadiogroup()`
      wiring disabled (ArrowRight 2 fails, Home/End 2 fails), and `alt` truncated at the quote
      to reproduce the alt-text defect (SC 4.1.2, 1.1.1; 1 fail). A suite that has never failed proves nothing.

---

# 8. What is still open

**Nothing is failing and nothing is unanswered.** Every Level A/AA criterion in scope for
`#visualizer` is verified, inspected, or not applicable — see `a11y-1-criteria.md`.

**SC 2.5.3 on `#select-model-lg` is a plain pass.** It is named via `aria-labelledby` from two
spans sharing its floating-label slot: a static "Model:" prefix that never changes, and the
pre-existing family value span (`ID.7`/`ID.Polo`/`Grand California`) — separate elements, so the
static half can't drift with the value. The old fixed-167px box that truncated the longest family
name is gone: `.select-wrap` is now `display: grid` with the label and the native `<select>`
sharing one cell, so the box's intrinsic width tracks whichever is wider. Naming the control after
the value alone would still be wrong regardless of the width fix: the name would mutate with the
value and misdescribe a control that also selects ID.Polo and Grand California.

**Two constraints to keep passing.** Both hold today and both are easy to break with a layout
change, so re-check them after any reflow work:

| SC | Constraint |
|---|---|
| **1.3.4** Orientation | No `@media (orientation:)` rule anywhere. Fullscreen's `rotate(90deg)` is user-invoked and reversible — it must never *restrict* content to one orientation. |
| **1.4.12** Text Spacing | Under the four overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) nothing may newly clip, no control may be lost, and no horizontal scroll may appear. |

**The screen-reader pass is done.** VoiceOver, all fifteen checks, Safari and Chrome — see
`a11y-2-automated-testing.md` §9.1. It found one defect no tool reports: the disclaimer opened
focus onto its close button, *after* the text, so a user who opened it to read the disclaimer
heard only "Close Disclaimer". Fixed, with a test guarding the focus target.
**NVDA 2026.1.1.55980 is still owed** — the protocol names it, and VoiceOver is a deviation to
record rather than a substitution.

---

# 9. Appendix A — habits in the current live build

`volkswagen.de/de/modelle/id-polo.html` is the old design being replaced. These are **habits**, not defects to fix, but they show patterns likely to carry over:

| Observed | Maps to |
|---|---|
| Visible labels “Farben”, “Innenraum” with mismatched accessible names (“Farbauswahl anzeigen”, “Interieur anzeigen”). | SC 2.5.3 |
| 6 colour swatches as ungrouped buttons using `aria-current` instead of `radiogroup` + `aria-checked`. | SC 1.3.1, 4.1.2 |
| `aria-label="Active color: Pythongelb Metallic"` on `<html lang="de">`. | SC 3.1.2 |

Already correct and worth keeping: zoom controls are real buttons with localised labels; `Zoom_Out` correctly carries `disabled` at minimum zoom.

---

# 10. Appendix B — measured reference

This appendix captures what the reference actually exposes — names, tab order, ARIA wiring — so ports can diff against something concrete.

## 10.1 Viewer controls (`#media`)

Representative elements:

- `#media` region — name “car viewer”; box ~1440×662.  
- A11y buttons: zoom in/out, rotate left/right, tilt up/down, toggle interior/exterior view, fullscreen (narrow viewports).  
- `#img-car` — exterior image with full descriptive alt.  
- `#image-interior` — `<canvas role="img">` with static `aria-label` explaining the panorama and pointing to accessibility buttons.

## 10.2 Selector controls (`#bottombar`)

Representative structure:

- Colour, wheel, material selectors: each `group` → `radiogroup` → `radio` buttons with names from nested `<img alt>`.  
- Wheel label: becomes button while truncated, plain text when fully visible (see SC 4.1.2 above).  
- Model select: `#select-model-lg` named via `aria-labelledby` from a static "Model:" prefix span sharing its floating-label slot with the pre-existing family value span.  
- Info button: `#btn-info` toggles the disclaimer `dialog`.

## 10.3 Swatch names

- Colours: 13 distinct names (including “Grenadilla Black Metallic”, “Scale Silver Metallic Black”, “Kings Red Premium Metallic Black”).  
- Wheels: 5 distinct names with embedded quotes and long descriptions.  
- Materials: 5 placeholder names (“Material 1” … “Material 5”) — to be replaced by real data in production.

Embedded `"` characters in wheel names are load‑bearing; alt text must not be built via raw string interpolation.

## 10.4 Tab order

Each radiogroup is **one** tab stop — the checked radio — not one per radio. Arrows move within a
group, Tab moves between groups.

**Measured** (exterior, `#btn-a11y` collapsed):

| Viewport | Component tab stops | Radiogroup stops |
|---|---|---|
| 1440x900 | **10** | 2 |
| 768x1024 | **10** | 2 |
| 390x844 | **12** | 2 |
| 320x256 @ dsf 4 | **12** | 2 |

Opening `#btn-a11y` adds zoom and the two rotate buttons. Interior is **13**: the colour and wheel
sections go `display: none` and leave the tab order entirely, the material group takes their place
as a single stop, the tilt buttons appear, and `#label-wheel` goes.

**0 stops land on an invisible control at any width.**

> **Do not derive this count — measure it.** Before roving `tabindex` the collapsed figures were 26
> at 1440/768 and 27 at the narrow widths, and subtracting the 16 removed radio stops predicts 10
> and 11. The narrow widths actually measure **12**, because two things vary with width and neither
> is in that arithmetic: `#btn-fullscreen` appears, and a `.swatch-arrow` becomes focusable as soon
> as a strip overflows — it is `disabled`, therefore unfocusable, when it does not. This prediction
> was made and was wrong; the table is the only trustworthy form.

## 10.5 Conditional controls

Four controls appear and disappear. Each is correct — a control that does nothing must not be in
the tab order — but it means *"count the tab stops once"* is not a valid test.

| Control | Present when | Mechanism |
|---|---|---|
| `.swatch-arrow` x6 | the strip can scroll **that way** | `disabled` + `pointer-events: none`; a disabled button is not focusable |
| `#btn-zoom-out` | zoom > 1 | `syncZoomBtns()` |
| `#label-wheel` | its text is truncated | `role`/`tabindex`/`aria-expanded` derived from measured overflow (SC 4.1.2, see above) |
| `#btn-fullscreen` | narrow viewports | CSS |

**`#label-wheel` flips twice across the range, which is the useful test.** Measured, window width
against `scrollWidth`/`clientWidth`:

| Width | Label | Exposed as |
|---|---|---|
| 1024–1920 | truncated, 498 > 214 | `role="button"`, `tabindex="0"`, `aria-expanded="false"` |
| **640–900** | **fits exactly**, `scrollWidth === clientWidth` | **no role, `tabIndex -1`** |
| 320–540 | truncated, 498 > 214–438 | `role="button"`, `tabindex="0"` |

The middle band exists because the layout changes, not the text: above 1024 the label sits in a
214px column, but between 640 and 900 it gets the full width (538–798px) and the name fits.

So *"it announces as a button"* is the **correct** result at any normal desktop width and proves
nothing. **Test at ~768px**, where it must announce as plain text and leave the tab order. Verified
by VoiceOver: there it is skipped by Tab and read only when the cursor lands on it.

**The arrows are the one that will fool a test.** At 1440 and 768 the colour strip does not overflow
(`scrollWidth === clientWidth`: 732 at 1440, 736 at 768), so both arrows are `disabled` and neither
is a tab stop. At 390 the strip *does* overflow (732 > 358) and the **right** arrow is enabled while
the left is not — there is nothing to scroll left to at `scrollLeft: 0`. Tab round once and
*"Scroll colours left"* is absent; tab round a **second** time and it is there, because moving focus
through the swatches scrolled the strip and enabled it.

## 10.6 Live regions

Polite live regions announce:

- Zoom state.  
- Newly selected colour, wheel, material (full names, including quotes).  

Inactive sections’ live regions are removed with them so they cannot announce into hidden views.

---

## 10.7 ARIA wiring

Key relationships:

- Info and a11y buttons wired with `aria-expanded` + `aria-controls` to their panels/groups.  
- Radiogroups wired via `aria-labelledby` to section headings.  
- Viewer carries `aria-roledescription` and `aria-describedby` for keyboard help.  
- Disclaimer is `role="dialog"` with `aria-modal="false"`.  
- Interior panorama is `<canvas role="img">` with `aria-label`.

---

## 10.8 Keyboard map

Examples:

- `#media` + arrow keys: rotate frames and tilt interior panorama.  
- Swatches: Space/Enter select; arrows move and select within group; Home/End jump to first/last.  
- Info button: Enter/Space toggle disclaimer; focus moves into content, Escape closes and returns focus appropriately.  
- Wheel label button: Enter/Space expand/collapse truncated label, driven by measured overflow.

Harnesses must dispatch full key event sequences (including `keypress`) so native `<button>` activation works under test.

---

## 10.9 Radiogroup keyboard pattern

Implemented pattern:

- One tab stop per group (checked radio `tabIndex=0`, others `-1`).  
- ArrowLeft/Right move and select, wrapping ends.  
- Home/End jump to first/last and select.  
- Selection follows focus via `.click()` on the target radio, reusing existing selection logic and side effects.

A `MutationObserver` on `aria-checked` maintains roving `tabIndex` so any future selection function inherits correct behaviour.

---

## 10.10 Behavioural defects found by measurement

Three important behavioural bugs (now fixed in the reference) that scanners did not catch:

1. Info button’s `aria-expanded` did not reflect auto‑opened disclaimer; name lied about state.  
2. Radiogroups had no keyboard interaction model (no arrows/Home/End); APG pattern was missing.  
3. Rotation was silent while zoom announced; users had no feedback that frames were changing.

All three are **state** bugs, not markup bugs; regression tests should assert behaviour, not only attributes.

---
