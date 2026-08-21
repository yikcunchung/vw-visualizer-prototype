# A11y handoff — VW Car Visualizer (prototype → production)

**Audience:** the production devs porting this component (AEM + React + styled-components).
**Source of truth:** `A11Y-REFERENCE.md` in this repo (`yikcunchung/vw-visualizer-prototype`).
Do not re-derive the rules from the prototype's HTML — read the reference; it explains *why*
each line is the way it is, which is the part that survives a rewrite.

---

## 1. Status in one line

The prototype passes **every WCAG 2.2 A/AA check that automation can perform** — 0 axe violations
across 5 viewports including literal 400% zoom, 0 unnamed controls, 0 duplicate role+name pairs, all
13 behavioural and 6 visual invariants verified by driving real pointer and key events, with every
detector proven against injected defects. **It is not certified "fully compliant":** screen-reader
announcement has never been tested, and two claims rest on documented judgement calls.

**The prototype's code is not production's code.** What transfers is the 27 invariants and the
reasoning, not the implementation.

---

## 2. What you must not lose in the port

`A11Y-REFERENCE.md` lists 27 invariants (A1–A8 markup, B1–B13 behaviour, C1–C7 visual). Each names
the SC it protects and the concrete bug that motivated it. **Part D** is the shortlist of the seven
that React/styled-components specifically tends to break:

| # | Trap | Invariant |
|---|---|---|
| 1 | `EditableComponent` wrapper injects a div inside `role="radiogroup"`, orphaning the radios | **A3** — highest risk |
| 2 | C1's focus ring uses ID specificity (`#btn-a11y.active:focus-visible`) — styled-components cannot emit that; re-express as props (`$active`, `$hovered`) | **C1** |
| 3 | `createGlobalStyle` injection order is not guaranteed to beat component styles — scope focus styles to the component | **C1** |
| 4 | `{open && <Panel/>}` unmounts while focus is inside → focus drops to `<body>`; effect-dependency mistakes break this **silently** | **B6, B13** |
| 5 | rAF not cancelled on unmount → the auto-rotation leaks | **B4** |
| 6 | `dangerouslySetInnerHTML` is the one route back to the original Level A bug | **B1** |
| 7 | Unstable list keys | **B11** |

### The three defects most likely to reappear

These are real bugs that were found and fixed here, each invisible to axe:

1. **Wheel names truncated at an embedded quote** (Level A, 4.1.2). Names like
   `Leichtmetallräder "Mataró" 8,5 J x 21 …` were interpolated into an `alt="…"` attribute, so the
   name ended at the first `"`. Multiple radios then shared an identical accessible name. **Set
   `src`/`alt` as DOM properties, never by string-building markup.**
2. **Pointer users could not un-zoom** (fixed in PR #11). `mousedown` calls `preventDefault()` to
   stop image drag, which also suppresses the default focus, so `activeElement` stayed `<body>` and
   every `active === media` guard failed. **Focus the viewer explicitly on `pointerdown`.**
3. **Keyboard zoom did not re-sync the zoom buttons** (4.1.3). Derive `disabled` from state; never
   set it on only some code paths.

### One thing to fix rather than copy

`#label-wheel` is a `<span role="button" tabindex="0">`, only **17px tall** — under the 24×24
minimum. **It does pass SC 2.5.8**, but only through the **spacing exception**, and the margin is
thin.

The normative test is a 24px-diameter circle centred on the undersized target, which must not
intersect a full-size neighbour's **box** (not "centres 24px apart" — that variant only applies when
both neighbours are undersized). Measured clearance from `#label-wheel`'s centre to the nearest
`.btn-swatch` box is **20.4px** at 1440 / 390 / 320, against a **12px** requirement — i.e. **8.4px
of headroom**. Remove roughly 8px of vertical spacing from that row and it becomes a real AA
failure with no exception available.

**Recommendation: don't port this pattern.** Ship a native `<button>` sized ≥ 24×24. That removes
both the dependency on a layout-sensitive exception and the `role="button"` span.

---

## 3. Acceptance criteria (testable, copy into the story)

- [ ] axe-core, **bare `axe.run(document)` with no tag filter**, 0 violations at 320 / 390 / 768 /
      1440 and at 400% zoom (`320x256 @ deviceScaleFactor 4`), in both default and
      all-disclosures-expanded state.
- [ ] Every axe `incomplete` ("needs review") item resolved and recorded — that bucket is what a
      BITV tester must clear by hand. "0 violations" alone is not a pass.
- [ ] Accessibility tree: **0 unnamed interactive nodes, 0 duplicate role+name pairs.** Colour and
      wheel radios each have a unique name, quotes intact.
- [ ] Keyboard only, no mouse: rotate (←/→), pan and tilt in interior, zoom (Enter **and** Space),
      open/close the spec panel, and stop the auto-rotation.
- [ ] Focus returns to **whoever opened** the spec panel — the trigger if a user opened it, the
      viewer if it auto-opened. Escape from outside the panel must close it **without moving focus**.
- [ ] Focus ring ≥3:1 **in every state**, including hover and active (the tan fill is the trap).
- [ ] No focused control ends up behind a `position: fixed` bar (`scroll-padding-top/bottom`).
- [ ] Swatch scroll arrows act on **pointer-up**, and dragging off before release aborts.
- [ ] No horizontal scroll at 320px.
- [ ] Screen-reader pass on **NVDA + VoiceOver** — see §5, this is the open gap.

---

## 4. How to verify (don't hand-wave it)

The recipe is in `A11Y-REFERENCE.md` → *Verification recipe*. Three traps that produce a
confident false pass, all of which bit this audit:

1. **The component lazy-initialises on scroll** (IntersectionObserver). Auditing before it exists
   returns axe 0 violations on an unbuilt component. **Step 0: scroll it into view and poll until
   `#grid-colour [role=radio]` is non-empty before measuring anything.**
2. **Don't pass `runOnly:{type:'tag'}` and call it "all rules"** — a tag filter silently skips rules.
   And always read `incomplete`, not just `violations`.
3. **Validate the harness on deliberately broken code first.** Every "PASS" in the 2026-08-21 record
   was re-run against a copy with that specific defect injected, and every detector fired. Two of
   the fixtures were themselves wrong before they were right (details in the record) — a green
   result from an unvalidated harness means nothing.

Literal 400% zoom is `setDeviceMetricsOverride{320x256, deviceScaleFactor:4}`.
`deviceScaleFactor:1` is a small screen, not a zoomed one.

---

## 5. Known gap — needs a human

**Real screen-reader output has never been tested.** The accessibility tree proves what is
*exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. Six discretionary decisions
(Part G) can only be settled by listening — in particular:

- `aria-roledescription="3D viewer"` on `#media`
- `role="dialog" aria-modal="false"` on the spec panel
- `<canvas role="img">` with **one static label** for a panorama whose view changes as you pan
- rotate/tilt controls hidden behind the `#btn-a11y` toggle — 2.1.1 Intent Note 2 permits a separate
  keyboard mode but asks how users *discover* it

Each row in Part G lists a fallback that conforms if an auditor rejects the decision. Budget a
screen-reader session; it is the only thing standing between this component and a defensible
"fully compliant" claim.

---

## 6. Also relevant

axe **cannot** replace WAVE, and neither replaces reading the spec. On five sibling VW prototypes
that axe scored 0 violations, the real WAVE engine still reported 10 "Empty form label" errors and
3 sr-only contrast errors — and a genuine **SC 2.5.3 label-in-name** failure was invisible to every
tool (axe-core has no `label-in-name` rule at all). Run WAVE against a public URL as well.

---

## 7. WCAG 2.2 A/AA — criterion-by-criterion coverage

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
| **2.5.8** | AA | Target Size (Minimum) | ⚖️ Pass — judgement call | **Passes via the spacing exception only.** `#label-wheel` is 17px tall; circle-to-box clearance to `.btn-swatch` is **20.4px** against a 12px requirement — **8.4px headroom**. Spacing is load-bearing; ship a native >= 24x24 `<button>` instead. See §2. |
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

Plus the standing method gap, not a criterion gap: **no real screen-reader testing** (§5).
