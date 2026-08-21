# JIRA — Visualizer (new design): WCAG 2.2 AA acceptance criteria

**Goal:** the new Visualizer ships WCAG 2.2 **Level A + AA** compliant — the level EN 301 549
clause 9 requires, and therefore BFSG / the European Accessibility Act.

**Status:** the new design *is* the prototype. A **reference build** of it exists and is deployed:

- **Live reference:** https://yikcunchung.github.io/vw-visualizer-prototype/index.html
- **Source + contract:** https://github.com/yikcunchung/vw-visualizer-prototype

The reference is vanilla HTML/JS. **Do not copy it** — it is a behavioural specification. Roughly
half the required behaviour lives in JavaScript, not markup, so a port that copies the DOM and
rewrites the logic will silently drop it.

> **This cannot be closed with a clean axe/WAVE/Lighthouse run.** The reference passed all three
> while containing genuine **Level A** failures. Acceptance is by accessibility tree and real
> keypresses — see *Definition of Done*.

> **What the reference build can and cannot claim** (audited 2026-08-21, see the coverage table
> below). Every A/AA criterion verifiable by static analysis, the accessibility tree, or driving
> real pointer and key events **passes — 0 known failures**. It is **not** certified "fully
> compliant": a real screen-reader pass has never been run (DoD item 6, which this document itself
> calls *not optional*), two criteria pass on documented judgement calls, and six are site-level or
> unassessed. Do not quote a blanket compliance claim from this document.

---

## Requirements

Each one: what, why, wrong vs right, how to check.

### R1 — A container that holds controls must not itself be a control
**SC 4.1.2** · Level A

```jsx
// ✗ a button containing ten buttons: invalid HTML, ambiguous activation,
//   polluted accessible name, focus appears to land twice on one object
<div role="button" tabIndex={0} aria-label="Zoom car image"> <Button/> …×10 </div>

// ✓
<div role="region" aria-label="Vehicle viewer" aria-roledescription="3D viewer" tabIndex={0}>
```
In React this recurs as `<ClickableCard><Button/></ClickableCard>` — the violation exists in
**neither component's source**, so code review structurally cannot catch it.

**Check:** accessibility tree — no interactive node nested inside another.

---

### R2 — Never build a name by string interpolation
**SC 4.1.2, 1.1.1** · Level A · *the bug that survived every automated tool*

Product names contain double quotes: `Leichtmetallräder "Mataró" 8,5 J x 21`, `16" Silver`.

```jsx
// ✗ the quote closes the attribute early. All five wheel radios ended up named
//   "Leichtmetallräder " — identical, indistinguishable to a screen reader.
el.innerHTML = `<img alt="${name}">`;

// ✓ JSX escapes automatically
<img alt={name} />
// ✓ or, outside JSX
img.alt = name;
```
`dangerouslySetInnerHTML` reopens this hole.

**Check:** accessibility tree — sibling controls must have **unique** names.

---

### R3 — Selection state derives from state
**SC 4.1.2** · Level A

```jsx
// ✗ class updated, ARIA forgotten → they desync
btn.className = i === selected ? 'selected' : '';

// ✓ impossible to desync
<button role="radio" aria-checked={i === selected}>
```
Same for `aria-expanded` and `aria-pressed`. Every path must update it — a keyboard path that
updates state but not the dependent controls is a real bug we hit.

---

### R4 — Exclusive option sets are a group
**SC 1.3.1, 4.1.2** · Level A

```jsx
<div role="radiogroup" aria-labelledby="title-colour">
  <span id="title-colour">Farben</span>
  {colours.map((c,i) => <button role="radio" aria-checked={i===sel} key={c.code}>…</button>)}
</div>
```
`aria-current` is **not** a substitute — it means "current item in a set" (e.g. current page in
navigation), not "selected option in an exclusive group".

> **AEM caveat:** a radiogroup must *own* its radios. If each swatch is separately authorable,
> `EditableComponent` injects a wrapper `<div>`, ownership breaks, and the group collapses in the
> accessibility tree while the JSX still looks correct. Keep the group as one component, or wire
> `aria-owns` explicitly.

---

### R5 — Act on the up-event
**SC 2.5.2** · Level A

```jsx
// ✗ fires immediately; no way to abort by dragging off
<button onPointerDown={scroll}>
// ✓
<button onPointerUp={scroll}>   // or onClick
```
*W3C exception: controls emulating a keyboard key press may use the down-event.*

---

### R6 — Motion must be stoppable by keyboard
**SC 2.2.2** · Level A

The interior panorama auto-rotates indefinitely. Binding the stop to `mousedown` alone leaves
keyboard users no way to stop it.

```jsx
// ✓ stop on any interaction, and clean up on unmount or the rAF leaks
useEffect(() => { const id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id); }, [deps]);
onKeyDown={e => { if (isArrow(e.key)) { stopAutoRotate(); pan(e.key); } }}
```

---

### R7 — Hidden controls leave the tab order
**SC 2.4.7** · Level AA

```jsx
// ✗ opacity:0 + pointer-events:none but still tabbable → focus lands on an
//   invisible dead button with no visible focus indicator
<button className={visible ? 'show' : ''}>
// ✓
<button disabled={!visible}>
```
Use `inert` for whole groups.

---

### R8 — Focus moves in, and comes back
**SC 2.4.3** · Level A

Opening the spec panel moves focus into it; closing returns focus to the trigger.

> **React trap:** with `{open && <Panel/>}`, unmounting while focus is inside drops focus to
> `<body>`. Keep it mounted and hidden, or restore focus explicitly. A wrong effect dependency
> array breaks this **silently** — no error, invisible to axe.

---

### R9 — Drag needs a non-drag alternative
**SC 2.5.7** · Level AA

Drag-to-rotate is covered by the rotate/tilt buttons and arrow keys. *Only path-dependent
underlying functions (e.g. freehand drawing) are exempt — reaching a view angle is endpoint-based,
so no exemption applies.*

---

### R10 — Stable list keys
**SC 2.4.3** · Level A

Rim availability is filtered per colour. Index keys remount the swatches and throw focus to
`<body>` mid-keyboard-navigation. Key on the product code.

---

### R11 — Localise accessible names
**SC 3.1.2** · Level AA

On `<html lang="de">` an English accessible name is read with German pronunciation. Mark
foreign-language product strings:

```jsx
<span lang="de">Leichtmetallräder "Mataró" …</span>
```

---

### R12 — Visible label must be inside the accessible name
**SC 2.5.3** · Level A

Otherwise speech-input users cannot activate a control by saying what they see.

```jsx
// ✗ visible "Innenraum", name "Interieur anzeigen" — no overlap at all
// ✓
<button aria-label="Innenraum anzeigen">Innenraum</button>
```

**No tool checks this.** axe-core has no `label-in-name` rule. The sibling `cost-simulator`
prototype shipped a real Level A failure here in its *initial* commit — `#battery-select` showed
"Motor / Battery Capacity" but was named "Motor **and** battery capacity" (the `/` written out as a
word), and `#trim-select` showed "The new ID.3 Neo" but was named "Which model are you interested
in?". axe returned 0 violations, Lighthouse scored 100, WAVE reported 0 errors, and a 55-criterion
walk missed it. Fixed in `22294d7` by pointing `aria-labelledby` at the visible label.

**Borderline case in the reference, decide deliberately:** `#select-model-lg` carries
`aria-label="Select model"` while the adjacent `<span class="select-label">` displays the *value*
("ID.7"). W3C is explicit that *"where a visible text label does not exist for a component, this
success criterion does not apply"* — a value display is not a label, so it passes. But the element
is **named** `select-label`, and a speech user saying "ID.7" would miss the control. Prefer
`aria-labelledby` on a genuine visible label.

---

### R13 — Focus indicator ≥3:1 in **every** state
**SC 1.4.11** · Level AA

The orange ring measures 3.75:1 on white but only **2.04:1** on the tan hover/active fill. Switch
the ring colour when the background changes — prop-driven, since styled-components cannot express
the ID-specificity selectors the reference uses.

---

### R14 — Every target ≥24×24 CSS px, or provably spaced
**SC 2.5.8** · Level AA

24×24 CSS px is the rule, but the criterion **permits exceptions** — spacing, equivalent control,
inline, user-agent-controlled, essential. Read literally ("every target ≥24×24") this requirement
is stricter than WCAG, and **the reference build would fail its own R14**.

The spacing exception is easy to test wrongly. It is **not** "centres ≥24px apart" — that variant
applies only when *both* neighbours are undersized. Against a full-size neighbour the test is: a
**24px-diameter circle centred on the undersized target must not intersect that neighbour's box**,
i.e. ≥12px clearance from centre to box edge.

In the reference, `#label-wheel` (a `<span role="button">`, **17px tall**) passes on this exception
alone: measured clearance to `.btn-swatch` is **20.4px** against 12px required — only **8.4px of
headroom**, at 1440 / 390 / 320. That spacing is load-bearing; remove ~8px and it becomes a real AA
failure with no exception left.

**For the new build: don't inherit the dependency.** Ship a native `<button>` sized ≥24×24. If you
do rely on the exception anywhere, measure it circle-to-box and record the number.

---

### R15 — No content or control lost at 320×256 CSS px
**SC 1.4.10** · Level AA

---

### R16 — Status changes announced via a polite live region
**SC 4.1.3** · Level AA

```jsx
<span className="sr-only" aria-live="polite">{zoomed ? 'Zoomed in' : 'Zoomed out'}</span>
```
`.sr-only` must clip (`position:absolute; width:1px; height:1px; clip:rect(0,0,0,0)`), never
`display:none`.

---

### R17 — Pointer interaction must focus the widget, and arrow keys have two scopes
**SC 2.1.1** · Level A · *added 2026-08-21 — the root cause of two separate shipped bugs*

A viewer that suppresses its own focus is the single highest-yield defect in this component. It
shipped twice, in two different features, from one cause.

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

Consequences when this is missed — both were real, both invisible to axe:
1. **Rotation unreachable for pointer users.** Click the car, press Left/Right, nothing happens.
2. **Zoom could not be reversed.** A tap zoomed *in*, then Enter/Space could not zoom out — the
   user was stuck zoomed. Keyboard users were unaffected, so it survived keyboard-only testing.

**Arrow keys need two scopes, not one.** Split by whether the browser itself needs the key:

| Keys | Act when | Why |
|---|---|---|
| Left / Right | viewer focused **or nothing is focused** (`body` / `null`) | not page-scroll keys here; this is what makes pointer users able to rotate |
| Up / Down | viewer focused **only** | they are the browser's page-scroll keys — hijacking them with nothing focused freezes the page while the widget pans |
| Enter | viewer focused or nothing focused | no default page action, so accepting it costs nothing |
| Space | viewer focused **only** | it is the page-scroll key |

Implement the two axes as **two separate guards**. A single shared condition reintroduces one bug
while fixing the other — that is exactly how this regressed once already.

**Check:** click the viewer with the mouse, then press Left/Right and Enter without touching the
keyboard first. Then press ArrowDown with nothing focused and confirm the **page** scrolls.

---

## Layout bugs found in the reference — verify these in the new build

Arithmetic, not semantics. **Invisible to every accessibility tool**, and all three shipped in a
component that otherwise passed.

| Symptom | Cause | Fix |
|---|---|---|
| Panel's close button off-screen at 320px — panel impossible to dismiss | `min-width: 370px` beats `max-width: 100%` | `min-width: min(370px, 100%)` |
| Bottom bar pushed out of the viewport in rotated fullscreen (portrait) | an inherited `min-height` beats the fullscreen `height` | reset `min-height: 0`, clamp with `max-height` |
| Auto-scroll silently did nothing in fullscreen | `getBoundingClientRect()` (screen space) mixed with `scrollLeft` (layout space); under `rotate(90deg)` it computed `0` | use `offsetLeft` — transform-independent |

Pattern worth internalising: **a `min-*` property silently beating the intended size** — twice.

---

## WCAG 2.2 A/AA — criterion-by-criterion coverage


Every Level A/AA criterion, with applicability and status. WCAG 2.2 has **87** criteria
(31 A · 24 AA · 31 AAA + the obsolete 4.1.1). **The 31 AAA criteria are out of scope for an AA
target** — so if you are looking for something like 1.2.9 Audio-only (Live), that is AAA and does
not apply here. Names and levels are taken verbatim from the W3C normative spec.

Legend — **✅ Pass — verified**: driven or measured evidence. **✅ Pass — inspected**: code or
accessibility-tree inspection, not driven. **⚪ N/A**: no such content. **⚖️ Judgement call**:
passes, but on an arguable reading. **⚠️ Not assessed**: honestly unknown — do not assume a pass.

**Totals — 56 rows (55 live + the obsolete 4.1.1, listed for completeness):** 23 verified · 9 inspected · 16 not applicable · 2 judgement calls · **6 not assessed**. **0 known failures.**

| SC | Lvl | Name | Status | Evidence / reason |
|---|---|---|---|---|
| **1.1.1** | A | Non-text Content | ✅ Pass — verified | axe `image-alt` / `svg-img-alt` clean at 5 viewports; AX tree 0 unnamed interactive, 26 graphics named; swatch `alt` set as a property (B1). |
| **1.2.1** | A | Audio-only and Video-only (Prerecorded) | ⚪ N/A | No `<audio>`, `<video>` or `<iframe>`. The interior panorama is a `<canvas>`, not media. |
| **1.2.2** | A | Captions (Prerecorded) | ⚪ N/A | No prerecorded media. |
| **1.2.3** | A | Audio Description or Media Alternative (Prerecorded) | ⚪ N/A | No prerecorded media. |
| **1.2.4** | AA | Captions (Live) | ⚪ N/A | No live media. |
| **1.2.5** | AA | Audio Description (Prerecorded) | ⚪ N/A | No prerecorded video. |
| **1.3.1** | A | Info and Relationships | ✅ Pass — verified | axe 0 violations across all structure rules (`aria-*`, `list`, `heading-order`); `role="radiogroup"` + 18 radios exposed correctly in the AX tree. |
| **1.3.2** | A | Meaningful Sequence | ✅ Pass — inspected | DOM order matches visual order; real Tab sweep gives 34 coherent stops at 390 and 320. |
| **1.3.3** | A | Sensory Characteristics | ✅ Pass — inspected | Instructions are textual — `#media-help` says "Use the left and right arrow keys…", not "the control on the right". |
| **1.3.4** | AA | Orientation | ⚠️ Not assessed | **Not assessed.** Fullscreen applies `rotate(90deg)` to the component. Needs an explicit check that content is not *restricted* to one orientation. |
| **1.3.5** | AA | Identify Input Purpose | ⚪ N/A | No fields collecting information about the user; the single `<select>` is a product choice, not autocomplete-eligible. |
| **1.4.1** | A | Use of Color | ✅ Pass — inspected | Selection is conveyed by a checkmark badge and `aria-checked`, not colour alone; every swatch also carries its name. |
| **1.4.2** | A | Audio Control | ⚪ N/A | No audio. |
| **1.4.3** | AA | Contrast (Minimum) | ✅ Pass — verified | Every axe *needs-review* contrast node resolved on composited pixels: **23/23 pass, 8.59:1 – 21.00:1** at 1440 / 390 / 320@400%. |
| **1.4.4** | AA | Resize Text | ✅ Pass — verified | Literal 400% zoom (320x256 @ dsf 4): axe 0 violations, no horizontal scroll, no clipped text. |
| **1.4.5** | AA | Images of Text | ✅ Pass — inspected | All text is real text; car and wheel imagery is photographic, not images of text. |
| **1.4.10** | AA | Reflow | ✅ Pass — verified | No horizontal scroll at 320 / 390 / 768 / 1440 or at 400% zoom. Swatch strips judged bounded sub-widgets (Part G). |
| **1.4.11** | AA | Non-text Contrast | ✅ Pass — verified | Focus ring measured under a real hover: navy on tan = **8.61:1** in hover and active; 3.75:1 default on white. C1. |
| **1.4.12** | AA | Text Spacing | ⚠️ Not assessed | **Not assessed.** Requires applying the four text-spacing overrides (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) and confirming no content loss. |
| **1.4.13** | AA | Content on Hover or Focus | ✅ Pass — inspected | Hover/focus changes are background and outline only — no popups or tooltips that must be dismissible, hoverable and persistent. |
| **2.1.1** | A | Keyboard | ✅ Pass — verified | Full keyboard operation driven: rotate (arrows), pan/tilt in interior, zoom (Enter **and** Space), open/close panel, stop auto-rotation. B4, B5, B7. |
| **2.1.2** | A | No Keyboard Trap | ✅ Pass — verified | Tab sweep reaches 34 stops and exits; Escape closes the panel from anywhere. No trap. |
| **2.1.4** | A | Character Key Shortcuts | ⚪ N/A | No single-character shortcuts. Bindings are arrows, Enter, Space and Escape, all on a focused widget. |
| **2.2.1** | A | Timing Adjustable | ⚪ N/A | No time limits. |
| **2.2.2** | A | Pause, Stop, Hide | ✅ Pass — verified | Interior auto-rotation stoppable **by keyboard alone** — canvas hash frozen after `ArrowLeft`, mouse never used. B4. |
| **2.3.1** | A | Three Flashes or Below Threshold | ✅ Pass — inspected | No flashing content; animation is transforms and opacity only. |
| **2.4.1** | A | Bypass Blocks | ✅ Pass — inspected | Skip link present; `role="main"` on the content region. |
| **2.4.2** | A | Page Titled | ✅ Pass — verified | axe `document-title` clean; page titled. |
| **2.4.3** | A | Focus Order | ✅ Pass — verified | Panel open moves focus in; close returns to **whoever opened it** — trigger if a user did, viewer if it auto-opened. Escape from outside does not move focus. B6, B13. |
| **2.4.4** | A | Link Purpose (In Context) | ✅ Pass — verified | AX tree: 0 unnamed links, 0 duplicate role+name pairs across 394 nodes. |
| **2.4.5** | AA | Multiple Ways | ⚠️ Not assessed | **Not assessed** — site-level criterion; cannot be judged from a single prototype page. |
| **2.4.6** | AA | Headings and Labels | ✅ Pass — verified | One `h1`, two `h2`, axe `heading-order` clean; every control has an accessible name. |
| **2.4.7** | AA | Focus Visible | ✅ Pass — verified | Real Tab sweep: 34 stops, **0 invisible**. Ring contrast verified in default, hover and active. C1. |
| **2.4.11** | AA | Focus Not Obscured (Minimum) | ✅ Pass — verified | After the *browser* scrolls each control into view: **20/20** controls fully visible at 1440/390/320, **zero fixed or sticky occluders**. C6. |
| **2.5.1** | A | Pointer Gestures | ✅ Pass — verified | Drag-rotation has single-pointer alternatives: `#btn-rot-left` / `#btn-rot-right` plus arrow keys. No path-based gesture required. |
| **2.5.2** | A | Pointer Cancellation | ✅ Pass — verified | Swatch arrows fire on **pointer-up**; press-then-drag-off-then-release leaves scrollLeft at 0, so the action is abortable. B3. |
| **2.5.3** | A | Label in Name | ⚖️ Pass — judgement call | **Judgement call.** `#select-model-lg` has `aria-label="Select model"` while the adjacent `<span class="select-label">` displays the *value* ("ID.7"). W3C: *"where a visible text label does not exist for a component, this success criterion does not apply"* — a value display is not a label, so it passes. But the element is **named** `select-label`, and a speech user saying "ID.7" would miss the control. Safer: point `aria-labelledby` at a real visible label. **No tool checks this — axe has no `label-in-name` rule**, and a sibling VW prototype had a genuine 2.5.3 failure found only by hand. |
| **2.5.4** | A | Motion Actuation | ⚪ N/A | No device-motion or user-motion actuation. |
| **2.5.7** | AA | Dragging Movements | ✅ Pass — verified | Rotation and panning achievable without dragging — rotate/tilt buttons and arrow keys. |
| **2.5.8** | AA | Target Size (Minimum) | ⚖️ Pass — judgement call | **Passes via the spacing exception only.** `#label-wheel` is 17px tall; circle-to-box clearance to `.btn-swatch` is **20.4px** against a 12px requirement — **8.4px headroom**. Spacing is load-bearing; ship a native >= 24x24 `<button>` instead. See **R14**. |
| **3.1.1** | A | Language of Page | ✅ Pass — verified | `<html lang="en">`; axe `html-has-lang` clean. |
| **3.1.2** | AA | Language of Parts | ✅ Pass — verified | `lang="de"` on `#grid-wheel` and `#label-wheel`; the German wheel names inherit it. |
| **3.2.1** | A | On Focus | ✅ Pass — inspected | Focus causes no context change. Swatch focus scrolls the strip into view (2.4.11 support) — scrolling is not a change of context. |
| **3.2.2** | A | On Input | ✅ Pass — inspected | Changing the model `<select>` updates the same view in place; no new window, no focus jump. |
| **3.2.3** | AA | Consistent Navigation | ⚠️ Not assessed | **Not assessed** — multi-page criterion. |
| **3.2.4** | AA | Consistent Identification | ⚠️ Not assessed | **Not assessed** across pages; consistent within this page. |
| **3.2.6** | A | Consistent Help | ⚠️ Not assessed | **Not assessed** — site-level (where the help mechanism sits across pages). |
| **3.3.1** | A | Error Identification | ⚪ N/A | No user input that can be in error. |
| **3.3.2** | A | Labels or Instructions | ✅ Pass — verified | The `<select>` is named; `#media-help` supplies keyboard instructions and is rewritten per mode (B12). |
| **3.3.3** | AA | Error Suggestion | ⚪ N/A | No error conditions. |
| **3.3.4** | AA | Error Prevention — Legal, Financial, Data | ⚪ N/A | No legal, financial or data-modifying submission. |
| **3.3.7** | A | Redundant Entry | ⚪ N/A | No multi-step process requiring re-entry. |
| **3.3.8** | AA | Accessible Authentication (Minimum) | ⚪ N/A | No authentication. |
| **4.1.1** | A | Parsing | ⚪ N/A | **Obsolete — removed from WCAG 2.2.** Listed for completeness only. |
| **4.1.2** | A | Name, Role, Value | ✅ Pass — verified | AX tree: 394 nodes, **0 unnamed interactive**, **0 duplicate role+name**. 18 radios / 18 unique names with German quotes intact (the original Level A bug). |
| **4.1.3** | AA | Status Messages | ✅ Pass — verified | `#media-status` announces "Zoomed in"/"Zoomed out" on **all 8** zoom paths, `disabled` derived from state. B5. |

### The six open criteria, restated plainly

Six criteria, grouped into five items (3.2.3 and 3.2.4 share a cause). These are the only A/AA
criteria this audit does **not** answer:

1. **1.3.4 Orientation** — fullscreen applies `rotate(90deg)`; confirm content is not *restricted* to one orientation.
2. **1.4.12 Text Spacing** — apply the four spacing overrides and confirm no clipping or overlap.
3. **2.4.5 Multiple Ways** — site-level; needs the real IA, not one page.
4. **3.2.3 / 3.2.4 Consistent Navigation & Identification** — need a second page to compare against.
5. **3.2.6 Consistent Help** — site-level; where the help mechanism sits across pages.

Four of the six are **site-level and unanswerable from a single component** — they should be
assigned to whoever owns the page template, not to the visualizer team. Only 1.3.4 and 1.4.12 are
genuinely this component's to close.

Plus the standing method gap, not a criterion gap: **no real screen-reader testing** (Definition of Done, item 6).

---

## Definition of Done

1. **Accessibility tree** dump of the component subtree — every interactive node has a
   **non-empty, unique** accessible name. *(DevTools → Accessibility pane, or CDP
   `Accessibility.queryAXTree`.)*
2. **Real keyboard run** — Tab / Shift+Tab / Enter / Space / Arrows / Escape, asserting
   `document.activeElement` at each step. Focus must never land on an invisible control, and never
   be lost to `<body>` when a panel closes.
3. **Reflow** at 320×256 CSS px — nothing lost, no horizontal page scroll.
4. **Contrast** measured on **composited** pixels wherever text sits over imagery or a gradient.
   The declared CSS colour is not sufficient.
5. **SC 2.5.3** — visible label contained in the accessible name, for every labelled control.
6. **Screen reader** — one pass with NVDA or VoiceOver. Not optional: the accessibility tree shows
   what is *exposed*, not what is *announced*.
7. **CI** — `jest-axe` for the structural half; Playwright with real key presses plus
   `expect(page.locator(':focus'))` for the behavioural half. Both are needed to prevent regression.

---

## Appendix — habits observed in the current live build

`volkswagen.de/de/modelle/id-polo.html` is the **old** design and is being replaced, so these are
**not defects to fix**. They are listed because they show patterns likely to carry into the new
build. Captured from the live accessibility tree, 2026-08-16.

| Observed | Maps to |
|---|---|
| `Menu_ChangeColor` — visible "Farben", name "Farbauswahl anzeigen"; `Menu_OpenInterior` — visible "Innenraum", name "Interieur anzeigen". 2 of 3 fail. | **R12** |
| 6 colour swatches as ungrouped `<button>`s, container `role: null`, selection via `aria-current` | **R4**, **R3** |
| `aria-label="Active color: Pythongelb Metallic"` on `<html lang="de">` | **R11** |

Already correct today — **do not regress**: zoom controls are real `<button>`s with German labels,
and `Zoom_Out` correctly carries `disabled` at minimum zoom.

---

## Scope

**In:** the Visualizer component — media viewer plus its selector bar (colour / rim / interior /
trim / zoom).

**Out:** page chrome, PDFs, video, documentation. Note WCAG conformance is defined **per full page**
(spec §5.2.2) and **per complete process** (§5.2.3), so a conformant component does not by itself
make the page conformant — a page-level claim needs separate work.

## References

- Reference build + `A11Y-REFERENCE.md` contract: https://github.com/yikcunchung/vw-visualizer-prototype
  — see its **Verification record — 2026-08-21** for the evidence behind the coverage table above,
  including the detector-validation runs (each check re-run against deliberately broken code)
- Criterion text, Intent, techniques, ACT rules: `wcag22-full-reference.md`
  (verified against the normative spec — 87/87 criteria, 0 level mismatches)
- BITV audit of the old site: `BITV_Pruefuebersicht_Volkswagen_konsolidiert.xlsx`
