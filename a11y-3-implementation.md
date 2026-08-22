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

**No foreign-language content in the reference.** Every wheel name is English, and no `lang`
attribute is needed anywhere in the component. This rule is here for production: if a CMS field can hold a string in a language other
than the page, the component rendering it must be able to emit `lang` alongside it.

**Keep an equally long string in the test data.** The longest wheel name in the data is 90
characters (the one shown by default is 86), and it contains an embedded `"`. Several findings in this pack — 2.5.8 target size, 1.4.10 reflow, the panel
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

> **Why it exists** — Requiring viewer focus for all four arrows makes rotation unreachable for *pointer* users: clicking the car does not focus it, because the drag handler `preventDefault()`s the mousedown, so `activeElement` stays `<body>` and the arrows did nothing (measured: click centre of `#media`, `activeElement` BODY, ArrowRight frame-00 → frame-00). Up/Down must stay viewer-only because they are the browser's page-scroll keys — an earlier build that accepted body/null for all four `preventDefault()`ed ArrowDown and panned the panorama while the page stayed put (`scrollY 400 → 400`) for a user who had focused nothing. Porting note: implement the two axes as two separate guards, or you will reintroduce one bug while fixing the other.


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

> **Why it exists** — Scroll-arrows kept `tabindex=0` while at `opacity:0; pointer-events:none` — keyboard users landed on an invisible, dead button with no visible focus.


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

`SC 4.1.2` · **Level A**

**Rule:** the wheel label is a button **only while its text is actually truncated**. Derive `role`,
`tabindex` and `aria-expanded` from the measured overflow — never hardcode them in the markup.

Hardcoding them makes the label announce as a collapsed expandable even when the full name already
fits. At 768px the name fits exactly (`scrollWidth === clientWidth`), so a screen reader is told
*"button, collapsed"*, the user activates it, is told *"expanded"* — and nothing happens. Announced
state with nothing behind it. Short production names fit at every width, so the control would be
inert everywhere.

```jsx
// ✗ hardcoded — a fake control whenever the text fits
<span role="button" tabIndex={0} aria-expanded={open}>{name}</span>

// ✓ derive it, and re-measure on resize and on name change
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

Three details the reference implementation had to get right:

- **Measure the collapsed state.** Expanding sets `white-space: normal`, which makes
  `scrollWidth === clientWidth` — measure while expanded and it always reports "it fits".
- **Make the toggle inert without the role**, so a stray click cannot expand a label that has
  nothing to reveal.
- **Scope `cursor: pointer` to `[role="button"]`**, so it does not look clickable when it is not.

**Check:** at a width where the text fits, the label must expose **no role**, be **out of the tab
order**, and do nothing when clicked. At a width where it truncates, it must be a button that
expands to the full name. Resizing across the boundary must flip it both ways.

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

**Rule:** every target is at least 24×24 CSS px. If you cannot make one that big, you must justify
it against an exception — and record the measurement.

In this component **no target is under 24×24**. The smallest `<button>` is the close button at
exactly 24×24; scroll-arrows are 28, touch controls 32, swatches 48. `#label-wheel` is a
`<span>` rather than a `<button>`, so a survey of button sizes misses it — it is 26.4px tall via:

```css
#label-wheel { line-height: 1.6; padding-block: 2px; }   /* 26.4px */
```

**Padding, not a bigger `line-height`, on purpose.** SC 1.4.12 invites users to override
`line-height` to 1.5, so a target size built on `line-height` is built on the one property another
criterion tells users they may change. Padding is unaffected. For reference at a 14px font:
`line-height: 1.6` alone is 22.4px, `1.7` is 23.8px, and `1.72` is 24.1px — the instinctive values
all land short or clear by a rounding error.

#### If you ever do introduce an undersized target

The spacing exception is easy to test wrongly. It is **not** "centres ≥24px apart" — that variant
applies only when *both* neighbours are undersized. Against a **full-size** neighbour the test is:

> a 24px-diameter circle centred on the undersized target must not intersect that neighbour's
> **box** — i.e. **≥12px clearance from centre to box edge**.

For a 17px-tall target the element's own edge already sits 8.4px from its centre, so the required
**edge-to-edge gap is only 3.6px** — and a 3px gap fails while 4px passes by 0.4px. That is the
kind of margin that disappears with one font-metric change, which is why the component now meets
the size outright instead.

> **Measurement trap.** `revealSwatches()` animates swatches in from `translateY(12px)` over ~0.45s
> with staggered delays. Measure before it settles and neighbours read ~9px closer, which will
> manufacture a failure that does not exist. Poll until the geometry stops changing.

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
does not make the page conformant. These are fixed in `index.html` so the reference is
genuinely exemplary — none are required for the component port, but all are required for a
page-level claim.

| Fix | SC | The defect it removes |
|---|---|---|
| 7 subnav tabs → `<button type="button">` with `aria-current` tracked in JS | **2.1.1 (A)** | `<div>`s with click handlers — keyboard users could not reach or activate them. **No automated tool flags this.** |
| Skip link + `role="banner"` / `role="main"` landmarks | **2.4.1 (A)** | no bypass mechanism at all; skip link is now the first tab stop |
| `.label-header-midpage` → `<h2>` | 1.3.1 (A) | styled as a section heading but marked up as `<p>` |
| `aria-hidden="true"` on 17 further decorative SVGs | 1.1.1 (A) | unnamed graphics exposed in the accessibility tree |

Page-wide: **400 accessibility-tree nodes, 45 interactive controls, 0 unnamed**; landmarks `banner`,
`main`, `navigation` ×2 (named), `region: car viewer`. The only duplicate role+name pair on the page
is `alt="VW ID.7"` on three tiles — page chrome, none of it inside `#visualizer`.

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

# 9. What is still open

**Nothing is failing and nothing is unanswered.** Every Level A/AA criterion in scope for
`#visualizer` is verified, inspected, not applicable, or out of scope — see `a11y-1-criteria.md`.
The four page-level criteria (2.4.5, 3.2.3, 3.2.4, 3.2.6) belong to whoever owns the page template.

**One decision to record.** It passes; it needs a recorded position, not code:

| SC | Decision |
|---|---|
| **2.5.3** Label in Name | `#select-model-lg` is named "Select car model" while the adjacent span shows the value "ID.7". A value display is not a label, so it passes — but a speech-input user saying "ID.7" would miss it. Safer: `aria-labelledby` pointing at a real visible label. |

**Two constraints to keep passing.** Both hold today and both are easy to break with a layout
change, so re-check them after any reflow work:

| SC | Constraint |
|---|---|
| **1.3.4** Orientation | No `@media (orientation:)` rule anywhere. Fullscreen's `rotate(90deg)` is user-invoked and reversible — it must never *restrict* content to one orientation. |
| **1.4.12** Text Spacing | Under the four overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) nothing may newly clip, no control may be lost, and no horizontal scroll may appear. |

**What no automated pass can close:** a screen-reader run. VoiceOver is planned; the protocol names
NVDA 2026.1.1.55980, so record that as a deviation. Two tool runs also remain — WAVE via the browser
extension *after scrolling*, and one pass through the axe DevTools 4.131.2 UI.

---

# 10. Appendix — habits in the current live build

`volkswagen.de/de/modelle/id-polo.html` is the **old** design and is being replaced, so these are
**not defects to fix**. They are listed because they show patterns likely to carry into the new
build. Captured from the live accessibility tree, 2026-08-16.

| Observed | Maps to |
|---|---|
| `Menu_ChangeColor` — visible "Farben", name "Farbauswahl anzeigen"; `Menu_OpenInterior` — visible "Innenraum", name "Interieur anzeigen". 2 of 3 fail. | **A9** |
| 6 colour swatches as ungrouped `<button>`s, container `role: null`, selection via `aria-current` | **A3**, **B2** |
| `aria-label="Active color: Pythongelb Metallic"` on `<html lang="de">` | **A5** |

**Already correct today — do not regress:** zoom controls are real `<button>`s with German labels,
and `Zoom_Out` correctly carries `disabled` at minimum zoom.

---
