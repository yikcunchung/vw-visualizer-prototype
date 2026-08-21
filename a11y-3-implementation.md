# A11y 3 of 3 — What to build

**Component:** VW Visualizer. **Target:** production vw.com — AEM + React SPA Editor +
styled-components.
**Companions:** `a11y-1-criteria.md` (every criterion, pass/fail) ·
`a11y-2-automated-testing.md` (what the tools can and cannot prove).

**Scope:** everything below applies to `#visualizer` (`#media` + `#bottombar`). All 16 elements
named by these rules were verified to sit inside that subtree. Page chrome — the nav, hero, tiles
and footer bar — is **out of scope** and belongs to the page-template owner. **Errors and failures
there are not findings for this team** and are not tracked in this pack.

> **Do not copy the reference build.** It is vanilla HTML/JS and it is a *behavioural
> specification*, not source to port. Roughly half the required behaviour lives in
> JavaScript — a port that copies the DOM and rewrites the logic will silently drop it.

---

## Start here — the four that actually shipped as bugs

Each of these was a real defect in the reference, and **no tool caught any of them**.

| Rule | What went wrong | Cost if missed |
|---|---|---|
| **B7** | `mousedown preventDefault()` (to stop image drag) also suppressed focus, so `activeElement` stayed `<body>` and every `active === viewer` guard failed | **Two** separate shipped bugs: pointer users could not rotate; a tap zoomed in and Enter/Space could not zoom out |
| **B1** | Product names contain `"` — `alt="${name}"` truncated at the quote, so five wheel radios shared one name | Level A failure; passed axe, Lighthouse **and** WAVE |
| **A9** | Visible label not contained in the accessible name | Level A; axe has **no rule** for it. A sibling VW project shipped it |
| **B6 / B13** | Panel unmounted while focus was inside, dropping focus to `<body>` | Breaks **silently** in React on a wrong effect-dependency array |

One more that is not a rule but a habit: **a name being present and unique does not make it
correct.** Four Grand California swatches carried the wrong colour name while every tool
scored clean. Check names against the thing they describe.

---

# 1. Semantics and naming

*What assistive tech is told the interface *is*. Wrong here and the description does not match the screen.*

| Rule | Requirement | SC |
|---|---|---|
| [A1](#a1) | Viewer container is a region, not a control | 4.1.2 |
| [A3](#a3) | Swatch groups are radiogroups | 1.3.1, 4.1.2 |
| [A4](#a4) | Spec panel is a named dialog | 4.1.2 |
| [B1](#b1) | Never interpolate alt text into markup | 4.1.2, 1.1.1 |
| [B2](#b2) | Selection state derives from state | 4.1.2 |
| [A9](#a9) | Visible label sits inside the accessible name | 2.5.3 |
| [A5](#a5) | Any passage in another language carries `lang` | 3.1.2 |
| [A2](#a2) | Decorative icons are aria-hidden | 1.1.1 |
| [A6](#a6) | Icon-only buttons: aria-label, no duplicate title | — |

<a id="a1"></a>

### A1 — Viewer container is a region, not a control

`SC 4.1.2`

The viewer container is **not** an interactive role. It is `role="region"` + `aria-label` + `aria-roledescription="car 360° viewer"`, and is focusable (`tabIndex={0}`) for arrow-key/zoom handling.

> **Notes for React/AEM** — **Originally `role="button"` wrapping 10 `<button>`s** — nested interactive controls. In React this recurs as `<ClickableCard><Button/></ClickableCard>`: the violation exists in *neither* component's source.


**In React**

```jsx
// ✗ a button containing ten buttons: invalid HTML, ambiguous activation,
//   polluted accessible name, focus appears to land twice on one object
<div role="button" tabIndex={0} aria-label="Zoom car image"> <Button/> …×10 </div>

// ✓
<div role="region" aria-label="Car viewer" aria-roledescription="car 360° viewer" tabIndex={0}>
```

---

<a id="a3"></a>

### A3 — Swatch groups are radiogroups

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

<a id="a4"></a>

### A4 — Spec panel is a named dialog

`SC 4.1.2`

The spec/disclaimer panel is `role="dialog"` with an accessible name.

> **Notes for React/AEM** — If it is non-modal, keep `aria-modal="false"`. Do not set `aria-modal="true"` without a focus trap.

---

<a id="b1"></a>

### B1 — Never interpolate alt text into markup

`SC 4.1.2, 1.1.1`

**Image alt text must never be interpolated into a markup string.** Set it as a property/prop.

> **Why it exists** — **Level A failure found in the original.** Wheel names contain `"` (`Alloy wheels "Mataró"`, `16" Silver`), which terminated `alt="…"` early. All five wheel radios ended up with the identical name `"Leichtmetallräder "` — indistinguishable to a screen reader. JSX `alt={name}` is safe; `dangerouslySetInnerHTML` is **not**.


**In React**

```jsx
// ✗ the quote closes the attribute early. All five wheel radios ended up named
//   "Alloy wheels " — identical, indistinguishable to a screen reader.
el.innerHTML = `<img alt="${name}">`;

// ✓ JSX escapes automatically
<img alt={name} />
// ✓ or, outside JSX
img.alt = name;
```

---

<a id="b2"></a>

### B2 — Selection state derives from state

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

<a id="a9"></a>

### A9 — Visible label sits inside the accessible name

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

`#select-model-lg` carries `aria-label="Select car model"` while the adjacent
`<span class="select-label">` displays the *value* ("ID.7").

- **It passes.** W3C: *"where a visible text label does not exist for a component, this success
  criterion does not apply"* — a value display is not a label.
- **But** the element is *named* `select-label`, and a speech user saying "ID.7" would miss it.
- **Prefer** `aria-labelledby` pointing at a genuine visible label.

---

<a id="a5"></a>

### A5 — Any passage in another language carries `lang`

`SC 3.1.2`

Mark any passage whose language differs from the page language, so a screen reader switches
pronunciation instead of reading it phonetically as the page language.

**No foreign-language content remains in the reference.** The German wheel names were long-text
placeholders; they were translated to English on 2026-08-21 and the `lang="de"` attributes removed
with them. This rule is here for production: if a CMS field can hold a string in a language other
than the page, the component rendering it must be able to emit `lang` alongside it.

**Keep an equally long string in the test data.** The longest wheel name is 90 characters and still
contains an embedded `"`. Several findings in this pack — 2.5.8 target size, 1.4.10 reflow, the panel
truncation bug, and the B1 quote-escaping failure — surfaced *only* because the fixture was that long
and that awkward. Short, clean production names would hide all four.

> **Notes for React/AEM** — Drive `lang` from the **content locale**, never hardcode it. If a CMS field can hold a string in a different language from the page, the component that renders it must be able to emit `lang` alongside it.


**In React**

```jsx
<span lang={locale}>{name}</span>
```

---

<a id="a2"></a>

### A2 — Decorative icons are aria-hidden

`SC 1.1.1`

Every decorative icon/SVG is `aria-hidden="true"`. (40 in the reference; 0 unnamed graphics remain in the a11y tree.)

> **Notes for React/AEM** — Put it on the SVG/wrapper inside the icon component so every consumer inherits it.

---

<a id="a6"></a>

### A6 — Icon-only buttons: aria-label, no duplicate title

*no single SC*

Icon-only buttons have an `aria-label` and **no** duplicate `title` with the same text.

> **Notes for React/AEM** — Redundant `title` is a WAVE alert. Losing `title` also loses the hover tooltip — accepted trade.

---

# 2. Keyboard and focus

*Roughly half this component's accessibility, and almost none of it visible to a scanner.*

| Rule | Requirement | SC |
|---|---|---|
| [B7](#b7) | Arrow keys have two scopes | 2.1.1 |
| [B6](#b6) | Panel opening moves focus in | 2.4.3 |
| [B13](#b13) | Panel closing returns focus to its opener | 2.4.3 |
| [B8](#b8) | Hidden controls leave the tab order | **2.4.7** |
| [B9](#b9) | Inactive groups are inert, not just hidden | 4.1.2 |
| [B4](#b4) | Auto-rotation stoppable by keyboard | **2.2.2** |
| [B14](#b14) | The expand control exists only when there is something to expand | 4.1.2 |
| [B11](#b11) | List keys stable across filtering | 2.4.3 |
| [B12](#b12) | Keyboard description stays truthful | 1.3.1 |
| [A8](#a8) | Viewer describes its own keyboard operation | 1.3.1 |

<a id="b7"></a>

### B7 — Arrow keys have two scopes

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

<a id="b6"></a>

### B6 — Panel opening moves focus in

`SC 2.4.3`

Opening the spec panel moves focus into it; closing returns focus to the trigger.

> **Why it exists** — **React trap:** if the panel is conditionally rendered (`{open && <Panel/>}`), unmounting while focus is inside drops focus to `<body>`. Prefer keeping it mounted and hidden, or explicitly restore focus. Effect dependency mistakes break this **silently**.

---

<a id="b13"></a>

### B13 — Panel closing returns focus to its opener

`SC 2.4.3`

Closing the spec panel returns focus to **whoever opened it**, and only when focus was inside the panel.

> **Why it exists** — Refines B6. The panel can be opened two ways — auto-opened on load, or by the info button — and the correct destination differs: the trigger if a user opened it, the viewer if it auto-opened. Blindly focusing the trigger sends the user somewhere they never were. Guard on `panel.contains(document.activeElement)` before moving focus at all, or `Escape` pressed from elsewhere on the page will yank focus across the document.

---

<a id="b8"></a>

### B8 — Hidden controls leave the tab order

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

<a id="b9"></a>

### B9 — Inactive groups are inert, not just hidden

`SC 4.1.2`

Non-active control groups are hidden from AT with `inert`, not just CSS.

> **Why it exists** — React support is version-dependent; set via ref if the pinned React version lacks the prop.

---

<a id="b4"></a>

### B4 — Auto-rotation stoppable by keyboard

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

<a id="b14"></a>

### B14 — The expand control exists only when there is something to expand

`SC 4.1.2` · **Level A in production**

**Rule:** the wheel label becomes a button **only when its text is actually truncated**. Derive
`role`, `tabindex` and `aria-expanded` from the overflow state — never hardcode them.

The design intent is that the label turns into a button when the width cannot show the full name.
**The reference does not implement that.** `role="button" tabindex="0" aria-expanded="false"` are
hardcoded in the markup, and the only attribute JavaScript ever touches is `aria-expanded`.

Measured at 1440 with the label's own text swapped for a realistic production name:

| | long fixture name (86 chars) | short production name (16 chars) |
|---|---|---|
| truncated | **yes** — 498 > 214 | **no** — 214 = 214 |
| `role` | `button` | **`button`** |
| `tabindex` | `0` | **`0`** |
| `aria-expanded` | `false` | **`false`** |

**This already happens in the reference, at 768px.** The wheel label is 666px wide there and the
text fits exactly — `scrollWidth 666 = clientWidth 666`, nothing truncated — yet:

```
role="button"  tabindex="0"  aria-expanded="false"     <- all still present
screen reader: "button, Alloy wheels \"Mataró\" 8.5 J…, collapsed"
activate:      height 24px -> 24px   (nothing changes)
               aria-expanded "false" -> "true"
```

A screen-reader user is told the control is **collapsed**, activates it, is told it is now
**expanded**, and nothing happened. The state is announced but corresponds to nothing. That is the
4.1.2 problem, and it is live at tablet width today — not a future production risk.

It gets worse with production data: short real names fit at *every* width, so the control is inert
everywhere. The result is a control that:

- announces as a **collapsed expandable button** with nothing to expand,
- occupies a **tab stop** that does nothing when activated,
- and is a **17px target**, dragging in the whole 2.5.8 spacing dependency (see C4) for no reason.

```jsx
// ✗ hardcoded — a fake control whenever the text fits
<span role="button" tabIndex={0} aria-expanded={open}>{name}</span>

// ✓ derive it from the measured overflow, and re-measure on resize and on name change
const ref = useRef(null);
const [truncated, setTruncated] = useState(false);
useLayoutEffect(() => {
  const el = ref.current; if (!el) return;
  const measure = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
  measure();
  const ro = new ResizeObserver(measure); ro.observe(el);
  return () => ro.disconnect();
}, [name]);

<span ref={ref}
      role={truncated ? 'button' : undefined}
      tabIndex={truncated ? 0 : undefined}
      aria-expanded={truncated ? open : undefined}>{name}</span>
```

**Check:** set a short name, confirm the label is **not** in the tab order and exposes **no** role.
Set a long one, confirm it is a button and expands.

---

<a id="b11"></a>

### B11 — List keys stable across filtering

`SC 2.4.3`

List `key`s must be stable across filtering.

> **Why it exists** — **React trap:** wheel availability is filtered per colour. Index-based keys remount swatches and throw focus to `<body>` mid-keyboard-navigation.

---

<a id="b12"></a>

### B12 — Keyboard description stays truthful

`SC 1.3.1`

The A8 keyboard description must be **rewritten whenever the key bindings change**, not written once.

> **Why it exists** — The arrow keys genuinely differ by mode: exterior steps left/right only, interior pans on all four axes. A single static sentence is therefore false in one of the two states. The reference swaps the text inside the mode-toggle callback, next to where the mode flag flips — putting it after the call is wrong, because the toggle defers through a width animation and the flag is not yet set. In React derive the string from mode rather than assigning it.

---

<a id="a8"></a>

### A8 — Viewer describes its own keyboard operation

`SC 1.3.1`

The viewer carries `aria-describedby` pointing at a visually hidden element that **states how to operate it by keyboard**.

> **Notes for React/AEM** — The viewer's keyboard alternative (B10) existed for a long time and was announced *nowhere*. The only on-screen hint says "Drag to rotate", carries `aria-hidden`, and fades after ~3s — its whole subtree exposed one node, `role=generic name=""`. So the alternative built for 2.1.1 / 2.5.7 was invisible to exactly the users it was built for; `#media` announced only its name and roledescription (today: "car viewer, car 360° viewer") and stopped. **Not a live region** — it must be read on focus and must not interrupt the A7 status region. See B12 for keeping it truthful.

---

---

# 3. Pointer and targets

*Touch, mouse and assistive pointing devices.*

| Rule | Requirement | SC |
|---|---|---|
| [B3](#b3) | Pointer actions fire on the up-event | **2.5.2** |
| [B10](#b10) | Drag has a non-drag alternative | **2.5.7** |
| [C4](#c4) | Every target ≥24×24 CSS px | 2.5.8 |

<a id="b3"></a>

### B3 — Pointer actions fire on the up-event

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

<a id="b10"></a>

### B10 — Drag has a non-drag alternative

`SC **2.5.7**`

Drag interactions must have a single-pointer, non-drag alternative.

> **Why it exists** — Drag-to-rotate is covered by the rotate/tilt buttons + arrow keys. *W3C exempts only path-dependent underlying functions (e.g. freehand drawing) — reaching a view angle is endpoint-based, so no exemption applies.*

---

<a id="c4"></a>

### C4 — Every target ≥24×24 CSS px

`SC 2.5.8`

Every target ≥ **24×24** CSS px.

> **Notes** — Smallest **`<button>`** is the close button at exactly 24×24; scroll-arrows 28, touch
> controls 32, swatches 48. But the smallest **target** is `#label-wheel`, a `<span role="button">`
> at **17px tall** — it is not a `<button>`, so a survey of button sizes misses it entirely. That is
> the one target relying on the spacing exception below.


**The exception, and where the reference depends on it.** 24×24 is the rule, but 2.5.8 permits
exceptions — spacing, equivalent control, inline, user-agent-controlled, essential.

The spacing test is easy to get wrong. It is **not** "centres ≥24px apart" — that variant applies
only when *both* neighbours are undersized. Against a **full-size** neighbour the test is: a
24px-diameter circle centred on the undersized target must not intersect that neighbour's **box**,
i.e. **≥12px clearance from centre to box edge**.

`#label-wheel` (a `<span role="button">`, **17px tall**) passes on this exception alone:

The nearest full-size neighbour is `.btn-swatch`, directly **above**. Because the label is 17px tall,
its edge sits ~8.4px from its own centre, so the **minimum edge-to-edge gap is 12 − 8.4 = 3.6px**.

Measured at 1440 / 390 / 320 / 320@400% — **identical at all four**:

| Current gap | Centre → swatch box | Required | Slack |
|---|---|---|---|
| **12px** | 20.4px | ≥12px | **8.4px — passes** |

**Gap budget, measured by forcing each value:**

| Total gap | Centre → box | Slack | Verdict |
|---|---|---|---|
| 12px (current) | 20.4px | +8.4px | ✅ pass |
| **4px** | 12.4px | **+0.4px** | ⚠️ passes, but that is a rounding error, not a margin |
| 3px | 11.4px | −0.6px | ❌ **fail** |
| 2px | 10.4px | −1.6px | ❌ **fail** |

**The cliff is between 3px and 4px.** 4px technically conforms with 0.4 of a pixel to spare — one
font-metric change, one sub-pixel rounding difference, and it flips. Do not tune the gap to 4px;
there is no reason to trade 8px of safety for 8px of density.

> **Measurement trap.** `revealSwatches()` animates the swatches in from `translateY(12px)` over
> ~0.45s with staggered delays. Measure before that settles and the swatches read ~9px lower,
> giving 11.4px and a **false FAIL** at 390. Poll until the label→swatch distance stops changing
> before trusting any number here. This produced a phantom mobile failure during the audit.

**Only `#label-wheel` is affected.** `#label-colour` and `#label-material` are the same visual size
and the same `.bb-sec-value` class, but carry **no `role` and no `tabindex`** — they are plain
live-region text, not targets, so 2.5.8 does not apply and they need no gap. Give either one a
`role="button"` or a `tabindex` and it inherits the whole problem.

#### Better: make the target 24px tall and the exception stops applying

Widening the *gap* is the wrong lever — it buys slack on an exception you should not need. Growing
the *target* removes the exception entirely. Measured at 1440 / 390 / 320, label height and verdict:

| Change | Height | Meets 24×24 | Verdict |
|---|---|---|---|
| none — `line-height: 1.2` | 16.8px | ✗ | passes **via exception**, 8.4px slack |
| `line-height: 1.5` | 21.0px | ✗ | **still** via exception — *not enough* |
| `line-height: 1.72` | 24.1px | ✓ | **passes outright** — but only 0.1px over |
| `line-height: 1.8` | 25.2px | ✓ | passes outright |
| `min-height: 24px` | 24.0px | ✓ | passes outright |
| **`padding-block: 4px`** | **24.8px** | ✓ | **passes outright** |

Two things worth knowing:

- **`line-height: 1.5` does not get you there.** At a 14px font it yields 21px — the instinctive
  "bump the line-height" value leaves you still relying on the exception.
- **Prefer `padding-block` or `min-height` over `line-height`.** SC 1.4.12 lets users override
  `line-height` to 1.5; padding and `min-height` are orthogonal to every property 1.4.12 touches, so
  they hold regardless. Measured under a 1.4.12 override: `padding-block: 4px` → 29px,
  `min-height: 24px` → 24px, both still passing outright.

Growing the label also shrinks the gap to the swatches (12px → 8px), which no longer matters — once
the target meets 24×24 the spacing exception is irrelevant.

**Implemented** as `line-height: 1.6; padding-block: 1px` → 24.4px, verified at 1440 / 768 / 390 /
320 / 320@400%. The target now meets 24×24 outright and the spacing exception no longer applies.
(`line-height: 1.6` alone gives 22.4px and would **not** have been enough — the padding is doing the
last 2px.)

**Do not inherit the dependency:** ship a native `<button>` sized ≥24×24.

---

# 4. Visual

*Contrast, focus indication, and not losing content when the layout is squeezed.*

| Rule | Requirement | SC |
|---|---|---|
| [C1](#c1) | Focus indicator ≥3:1 in every state | 1.4.11, 2.4.7 |
| [C2](#c2) | Text and icon contrast ≥4.5:1 | 1.4.3 |
| [C3](#c3) | Selected-state indicators ≥3:1 | 1.4.11 |
| [C6](#c6) | Focused control not behind fixed bars | **2.4.11** |
| [C5](#c5) | No content loss at 320×256 | 1.4.10 |
| [C7](#c7) | Scrollable regions are keyboard reachable | 2.1.1 |

<a id="c1"></a>

### C1 — Focus indicator ≥3:1 in every state

`SC 1.4.11, 2.4.7`

Every interactive control has a visible focus indicator with **≥3:1** contrast against its adjacent background — **in every state**, including hover and active.

> **Notes** — The orange ring (`#C86C03`) is 3.75:1 on white but only **2.04:1** on the tan hover/active fill (`#CCBDAB`). Reference switches the ring to navy `#1B2236` (8.61:1) when the control is hovered or active. **This cannot be ported as-is** — it uses ID specificity (`#btn-a11y.active:focus-visible`), which styled-components cannot generate. Re-express as prop-driven component styles (`$active`, `$hovered`).

---

<a id="c2"></a>

### C2 — Text and icon contrast ≥4.5:1

`SC 1.4.3`

Text and icon contrast ≥ **4.5:1** (≥3:1 for large text).

> **Notes** — Reference measures ≥8.4:1 throughout. Verify **composited** values — the disclaimer sits on `rgba(0,0,0,0.7)` over photography, so compute against the blend, not the declared colour.

---

<a id="c3"></a>

### C3 — Selected-state indicators ≥3:1

`SC 1.4.11`

Selected-state indicators ≥ **3:1**.

> **Notes** — Selected swatch border `#997F67` = 3.76:1.

---

<a id="c6"></a>

### C6 — Focused control not behind fixed bars

`SC **2.4.11**`

A focused viewer control must not end up **behind the page's fixed bars**. Reserve clearance with `scroll-padding-top` / `scroll-padding-bottom` on the scroll container.

> **Notes** — The browser scrolls a focused control into the *layout* viewport and considers that done — it has no idea a `position:fixed` header or action bar is painted on top. `#btn-toggle-view` landed **entirely** behind the bottom bar, 0 of 5 test points visible. The clearance values must track the real bar heights per breakpoint. This is a page-chrome interaction, but the control that disappears is the viewer's, so it is the viewer's problem to verify.

---

<a id="c5"></a>

### C5 — No content loss at 320×256

`SC 1.4.10`

No horizontal scrolling / content loss at **320×256** CSS px.

> **Notes** — Verified at 1× emulation. Sufficient techniques: **C31** (flexbox), **C32** (media queries + grid), **C34** (un-fix sticky elements).

---

<a id="c7"></a>

### C7 — Scrollable regions are keyboard reachable

`SC 2.1.1`

A control that scrolls (the spec panel's text block) needs `tabindex="0"`.

> **Notes** — Making it scrollable to satisfy C5 **created** a violation: a scrollable region must be keyboard-scrollable (ACT rule `0ssw9k`). Fixing one criterion opened another — re-run the full check after any overflow change, not just the criterion you were working on.

---

# 5. Announcements

*State changes that are not focus changes.*

| Rule | Requirement | SC |
|---|---|---|
| [A7](#a7) | A visually hidden polite live region exists | 4.1.3 |
| [B5](#b5) | Zoom announces and syncs on every path | 4.1.3 |

<a id="a7"></a>

### A7 — A visually hidden polite live region exists

`SC 4.1.3`

A visually hidden `aria-live="polite"` region exists for status announcements.

> **Notes for React/AEM** — `.sr-only` = `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap`. Do **not** use `display:none`.


**In React**

```jsx
<span className="sr-only" aria-live="polite">{zoomed ? 'Zoomed in' : 'Zoomed out'}</span>
```

---

<a id="b5"></a>

### B5 — Zoom announces and syncs on every path

`SC 4.1.3`

Zoom state must announce, and must keep dependent controls in sync, on **every** path (pointer tap, buttons, Enter/Space).

> **Why it exists** — Keyboard zoom updated state but never re-synced the zoom-in/out `disabled` flags — a functional bug as well as an a11y one. Derive `disabled` from state.

---

# 6. React, styled-components and AEM — the seven that bite

1. **`EditableComponent` wrapper vs `role="radiogroup"`** — see A3. Highest-risk item.
2. **ID-specificity CSS** — C1 must be rewritten as component styles.
3. **`createGlobalStyle` injection order** — a global `:focus-visible` rule is not guaranteed to
   beat component styles. Scope focus styles to the component.
4. **Conditional rendering vs focus** — see B6.
5. **rAF cleanup** — see B4.
6. **`dangerouslySetInnerHTML`** — the one route back to B1.
7. **Unstable keys** — see B11.

---

---

# 7. Page-level fixes, applied outside the component

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
`region: car viewer`.

**Still deliberately unchanged:** the four `.topbar-tab` items and four `.topbar-cta` icons have no
click handlers in this prototype. They are inert for mouse and keyboard alike, so parity holds and
adding button semantics would invent affordance that does not exist.

---

---

# 8. Definition of Done

A green CI run does not close this. The reference passed axe, Lighthouse **and** WAVE while
containing Level A failures.

- [ ] **Accessibility tree** — every interactive node has a non-empty, **unique** accessible name.
- [ ] **Real keyboard run** — Tab / Shift+Tab / Enter / Space / Arrows / Escape, asserting
      `document.activeElement` at each step. Focus never lands on an invisible control and is
      never lost to `<body>` when a panel closes.
- [ ] **Reflow** at 320×256 CSS px — nothing lost, no horizontal page scroll.
- [ ] **Contrast** measured on **composited** pixels wherever text sits over imagery or a gradient.
- [ ] **SC 2.5.3** by hand — visible label contained in the accessible name. No tool does this.
- [ ] **Names are correct**, not merely present and unique — check each against what it describes.
- [ ] **Screen reader** — one pass with NVDA or VoiceOver. Not optional.
- [ ] **CI** — `jest-axe` for the structural half, Playwright with real key presses plus
      `expect(page.locator(':focus'))` for the behavioural half. Both, or regressions return.
- [ ] **The suite fails when it should** — delete a rule and confirm CI goes red.

---

# 9. Two open items for this team

From `a11y-1-criteria.md`, four of the six unanswered criteria are page-level. These two are yours:

| SC | Action |
|---|---|
| **1.3.4** Orientation | Fullscreen applies `rotate(90deg)` — confirm content is not *restricted* to one orientation. |
| **1.4.12** Text Spacing | Apply the four spacing overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em); confirm no clipping. |

And two decisions to record, both currently passing: **2.5.3** (`#select-model-lg` naming) and
**2.5.8** (`#label-wheel` relies on the spacing exception with 8.4px of headroom — ship a native
`<button>` ≥24×24 and the dependency disappears).

---

# 10. Appendix — habits in the current live build

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
