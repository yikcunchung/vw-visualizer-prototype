# A11y 1 of 3 — WCAG 2.2 criterion checklist

**Component:** VW Visualizer — media viewer + selector bar (colour / rim / interior / trim / zoom).
**Audited:** 2026-08-22 against the live deployment.
**Scope:** `#visualizer` — `#media` + `#bottombar`. **Out of scope:** page chrome, video, and
PDFs (brochures, price lists, spec sheets) — PDFs are a separate conformance surface, EN 301 549
clause 10, checked with PAC rather than anything in this pack.
**Companion documents:** `a11y-2-automated-testing.md` (what the tools can and cannot prove) ·
`a11y-3-implementation.md` (what to build).

The conformance target is **Level A + AA** — what EN 301 549 clause 9 requires, and therefore
BFSG / the European Accessibility Act. That is **56 criteria** (32 A + 24 AA). The 31 Level AAA
criteria are not required and are not listed.

> **If EN 301 549 later becomes the formal target**, note that V3.2.1 (2021-03) references
> **WCAG 2.1**, not 2.2. The only practical delta is **4.1.1 Parsing** — obsolete in 2.2 but
> normative in 2.1 and listed by EN as clause 9.4.1.1. It is already satisfied here; it is kept
> in the table below rather than dropped, so the EN path is not silently broken.

| Status | Meaning |
|---|---|
| ✅ Pass | Verified by driving the component — real pointer and key events, or measured pixels |
| ✅ Pass\* | Verified by code and accessibility-tree inspection, **not** driven |
| ⚪ N/A | The component has no such content |

**52 of the 56 A/AA criteria are in scope for `#visualizer`, and all 52 are closed — 0 failures, 0 open items.** 27 verified · 9 inspected · 16 not applicable. The remaining 4 (2.4.5, 3.2.3, 3.2.4, 3.2.6) are page-level, cannot be judged from one component, and are not assessed here.

> **Scope rule:** only `#visualizer` counts. Errors and failures in page chrome — nav, hero, tiles, footer — are **not findings** and are not tracked here. Every figure in this pack is a component figure.

---


# 1. Perceivable


## 1.1 Text Alternatives

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.1.1** | Non-text Content | A | Yes | ✅ Pass | axe `image-alt`/`svg-img-alt` clean at 5 viewports; 0 unnamed interactive nodes; all 20 graphics in the component carry a name. |

## 1.2 Time-based Media

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.2.1** | Audio-only and Video-only (Prerecorded) | A | No | ⚪ N/A | No audio or video. The interior panorama is a `<canvas>`, not media. |
| **1.2.2** | Captions (Prerecorded) | A | No | ⚪ N/A | No prerecorded media. |
| **1.2.3** | Audio Description or Media Alternative (Prerecorded) | A | No | ⚪ N/A | No prerecorded media. |
| **1.2.4** | Captions (Live) | AA | No | ⚪ N/A | No live media. |
| **1.2.5** | Audio Description (Prerecorded) | AA | No | ⚪ N/A | No prerecorded video. |

## 1.3 Adaptable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.3.1** | Info and Relationships | A | Yes | ✅ Pass | axe 0 violations on all structure rules; `role="radiogroup"` + 18 radios correct in the AX tree. |
| **1.3.2** | Meaningful Sequence | A | Yes | ✅ Pass* | DOM order matches visual order; 34 coherent Tab stops at 390 and 320. |
| **1.3.3** | Sensory Characteristics | A | Yes | ✅ Pass* | Instructions are textual ("Use the left and right arrow keys…"), not shape or position. |
| **1.3.4** | Orientation | AA | Yes | ✅ Pass | Tested portrait **and** landscape at 390×844 / 844×390 / 320×640 / 640×320, in normal **and** fullscreen. No `@media (orientation:)` rule exists anywhere. Viewer and bottombar visible, 18 radios / 18 swatches present, no horizontal scroll, and the fullscreen exit control visible and inside the viewport in every case. The `rotate(90deg)` is a user-invoked fullscreen mode, reversible, and does not lock orientation. |
| **1.3.5** | Identify Input Purpose | AA | No | ⚪ N/A | No fields collecting user information. |

## 1.4 Distinguishable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.4.1** | Use of Color | A | Yes | ✅ Pass* | Selection shown by a checkmark badge and `aria-checked`, not colour alone. |
| **1.4.2** | Audio Control | A | No | ⚪ N/A | No audio. |
| **1.4.3** | Contrast (Minimum) | AA | Yes | ✅ Pass | Every axe *needs-review* node in the component resolved on composited pixels: 8.59:1 – 21:1. Lowest is `.disclaimer-i` at 8.59:1. |
| **1.4.4** | Resize Text | AA | Yes | ✅ Pass | 400% zoom (320×256 @ dsf 4): 0 violations, no horizontal scroll, nothing clipped. |
| **1.4.5** | Images of Text | AA | Yes | ✅ Pass* | All text is real text; imagery is photographic. |
| **1.4.10** | Reflow | AA | Yes | ✅ Pass | No horizontal scroll at 320 / 390 / 768 / 1440 or at 400% zoom. |
| **1.4.11** | Non-text Contrast | AA | Yes | ✅ Pass | Focus ring under real hover: navy on tan = 8.61:1 hover and active. |
| **1.4.12** | Text Spacing | AA | Yes | ✅ Pass | All four overrides applied (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) at 1440 / 390 / 320. **No newly clipped element, no control lost, no horizontal scroll.** The two elements clipped afterwards were already clipped before: `#media-help` (intentional 1×1 `.sr-only`) and `#label-wheel` (truncates by design) — and `#label-wheel` **expands to fully visible** under the overrides, all 86 characters, at every width. Detector validated with a deliberately clipped canary. |
| **1.4.13** | Content on Hover or Focus | AA | Yes | ✅ Pass* | Hover/focus changes are background and outline only — no popups to dismiss. |

# 2. Operable


## 2.1 Keyboard Accessible

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.1.1** | Keyboard | A | Yes | ✅ Pass | Driven: rotate, pan/tilt, zoom (Enter and Space), open/close panel, stop auto-rotation. |
| **2.1.2** | No Keyboard Trap | A | Yes | ✅ Pass | 34 Tab stops reached and exited; Escape closes from anywhere. No trap. |
| **2.1.4** | Character Key Shortcuts | A | No | ⚪ N/A | No single-character shortcuts; bindings are arrows, Enter, Space, Escape on a focused widget. |

## 2.2 Enough Time

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.2.1** | Timing Adjustable | A | No | ⚪ N/A | No time limits. |
| **2.2.2** | Pause, Stop, Hide | A | Yes | ✅ Pass | Canvas hash frozen after a keyboard `ArrowLeft` — stopped by keyboard alone. |

## 2.3 Seizures and Physical Reactions

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.3.1** | Three Flashes or Below Threshold | A | Yes | ✅ Pass* | No flashing; animation is transforms and opacity. |

## 2.4 Navigable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.4.1** | Bypass Blocks | A | Yes | ✅ Pass* | Provided by the host page: skip link, and `role="main"` on the region containing the component. |
| **2.4.2** | Page Titled | A | Yes | ✅ Pass | Provided by the host page; axe `document-title` clean. |
| **2.4.3** | Focus Order | A | Yes | ✅ Pass | Open moves focus in; close returns to whoever opened it; Escape from outside moves nothing. |
| **2.4.4** | Link Purpose (In Context) | A | Yes | ✅ Pass | 0 unnamed links, 0 duplicate role+name across the 158 nodes of the component subtree. |
| **2.4.6** | Headings and Labels | AA | Yes | ✅ Pass | `heading-order` clean; every control in the component named. |
| **2.4.7** | Focus Visible | AA | Yes | ✅ Pass | 34 Tab stops, 0 invisible; ring verified in default, hover and active. |
| **2.4.11** | Focus Not Obscured (Minimum) | AA | Yes | ✅ Pass | 20/20 controls fully visible after browser scroll-into-view; 0 fixed/sticky occluders. |

## 2.5 Input Modalities

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.5.1** | Pointer Gestures | A | Yes | ✅ Pass | Drag-rotate has button and arrow-key alternatives. |
| **2.5.2** | Pointer Cancellation | A | Yes | ✅ Pass | Arrows fire on pointer-up; drag-off-then-release aborts. |
| **2.5.3** | Label in Name | A | Yes | ✅ Pass | **Position recorded.** `#select-model-lg` is named "Select car model"; the adjacent span shows `ID.7`. That span is a **value display, not a label** — the criterion governs labels, so it does not apply. A speech user saying "ID.7" would not match, which is a real limitation but not this failure. **Do not "fix" it with `aria-labelledby` on that span** — see the note below. |
| **2.5.4** | Motion Actuation | A | No | ⚪ N/A | No device-motion actuation. |
| **2.5.7** | Dragging Movements | AA | Yes | ✅ Pass | Rotation and panning reachable without dragging. |
| **2.5.8** | Target Size (Minimum) | AA | Yes | ✅ Pass | **No target in the component is under 24×24.** `#label-wheel` is 26.4px tall (`line-height: 1.6` + `padding-block: 2px`), so it meets the minimum outright and nothing relies on the spacing exception. Smallest `<button>` is the close button at exactly 24×24. Confirmed both by measuring every control's box and by axe's own `target-size` rule, which **is disabled by default** and had to be switched on: it then passes on 27–29 nodes at 1440 / 390 / 320×256. |

# 3. Understandable


## 3.1 Readable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.1.1** | Language of Page | A | Yes | ✅ Pass | Provided by the host page: `<html lang="en">`; axe `html-has-lang` clean. |
| **3.1.2** | Language of Parts | AA | No | ⚪ N/A | **No foreign-language passages.** Every string in the component is English and no `lang` attribute is needed anywhere inside it. The rule still applies if production ever renders a string in a language other than the page — see **A5** in the implementation doc. |

## 3.2 Predictable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.2.1** | On Focus | A | Yes | ✅ Pass* | Focus causes no context change; swatch focus only scrolls the strip. |
| **3.2.2** | On Input | A | Yes | ✅ Pass* | Changing the model select updates in place; no new window, no focus jump. |

## 3.3 Input Assistance

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.3.1** | Error Identification | A | No | ⚪ N/A | No user input that can be in error. |
| **3.3.2** | Labels or Instructions | A | Yes | ✅ Pass | The select is named; `#media-help` gives keyboard instructions per mode. |
| **3.3.3** | Error Suggestion | AA | No | ⚪ N/A | No error conditions. |
| **3.3.4** | Error Prevention — Legal, Financial, Data | AA | No | ⚪ N/A | No legal, financial or data-modifying submission. |
| **3.3.7** | Redundant Entry | A | No | ⚪ N/A | No multi-step process requiring re-entry. |
| **3.3.8** | Accessible Authentication (Minimum) | AA | No | ⚪ N/A | No authentication. |

# 4. Robust


## 4.1 Compatible

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **4.1.1** | Parsing (obsolete — removed from WCAG 2.2) | A | Yes | ✅ Pass | **Obsolete in WCAG 2.2 — but still required if EN 301 549 is ever the formal target.** EN 301 549 V3.2.1 (2021-03) references **WCAG 2.1**, where 4.1.1 is normative, and lists it as clause 9.4.1.1. Already fixed in the reference (commit `d2245d8`, two validity errors); keep the Nu validator clean and it stays closed. |
| **4.1.2** | Name, Role, Value | A | Yes | ✅ Pass | `#visualizer` subtree: **158 AX nodes, 61 named, 0 unnamed, 0 duplicate role+name**; 18 radios / 18 unique names with embedded `"` intact. `#label-wheel` exposes `role="button"` **only while its text is truncated** — see **B14**. |
| **4.1.3** | Status Messages | AA | Yes | ✅ Pass | `#media-status` announces on all 8 zoom paths; `disabled` derived from state. |

---

# What is actually left to do

**No open criteria, no known failures, and no decisions left outstanding.** Every Level A/AA
criterion in scope for `#visualizer` is verified, inspected, or not applicable.

**The one decision, now recorded.** SC 2.5.3 on `#select-model-lg` is a pass and stays a pass:
the visible `ID.7` is the current *value*, and 2.5.3 governs labels.

**The tempting fix is wrong, and was tried and reverted.** Pointing `aria-labelledby` at the
visible span (plus an `.sr-only` purpose span) gives the name `"ID.7 Select car model"` while
the AX **value** is `"Pro Match Plus"` — measured. Three things break:

1. **It misdescribes the control.** The select chooses between ID.7, ID.Polo and Grand
   California. A name beginning "ID.7" says the control is *about* ID.7.
2. **The name mutates with the value** — it becomes `"Grand California Select car model"` on
   the next selection. Names must be stable; a control that announces differently over time
   is a moving target in a rotor or elements list.
3. **It conflates name with value**, which ARIA separates deliberately. `ID.7` is the
   optgroup label and `Pro Match Plus` the chosen option — two fragments of one selection,
   one of them wedged into the name.

**The only clean way to close it** is a design change: a visible `Model` label beside the
control, so visible text and accessible name are the same string by construction. That is a
design decision, not an implementation one, and nothing is failing without it.

**All three tool runs are done.** VoiceOver, all fifteen checks (§9.1); WAVE extension, 0 errors
and 0 contrast errors (§9.2); axe DevTools v4.134.1, 0 issues inside the component at WCAG 2.2 AA
(§9.3). Section numbers refer to `a11y-2-automated-testing.md`.

**NVDA 2026.1.1.55980 is the only instrument still owed.** The protocol names it; VoiceOver was run
instead, which is a **deviation to record, not a substitution** — a formal BITV / EN 301 549 audit
naming NVDA will not accept the VoiceOver evidence for that line item.

**One optional extra, outside the AA target.** `prefers-reduced-motion` is honoured nowhere in a
component with 23 CSS transitions, 7 keyframe sets, 5 WAAPI animations and an indefinite
auto-rotation. That is SC 2.3.3, Level AAA, so **not required** — but it is a few lines of CSS and it
matters to users with vestibular disorders.

# Decisions an auditor could challenge

24 of the 56 A/AA criteria have **no machine-testable ACT rule**, and several of those apply
directly here (1.4.11, 1.4.13, 2.5.1, 2.5.2, 2.5.8, 2.4.11). For those, "passes" reflects a
**judgement**, not a test result. The five calls below are defensible but contestable — if an
external audit challenges this component, expect it to be on one of these.

| Decision in the reference | Argument against | If challenged |
|---|---|---|
| `aria-roledescription="car 360° viewer"` on `#media` | Overrides the announced role; some auditors treat it as noise, and AT support varies | Drop the attribute — `role="region"` + label alone still conforms |
| `role="dialog" aria-modal="false"` on the spec panel | A non-modal dialog is semantically ambiguous; AT may still imply modality | Use `role="region"` with `aria-live="polite"`; no focus trap is implied |
| `<canvas role="img">` with one static `aria-label` for the interior panorama | The view **changes** as the user pans; a single fixed label cannot describe it | Announce orientation changes through the existing `#media-status` live region |
| Rotate/tilt controls live behind the `#btn-a11y` toggle (`inert` when closed) | 2.1.1 **Intent Note 2** permits a separate keyboard mode but explicitly asks how users *discover* it | Expose the group by default, or announce its availability on `#media` focus |
| Swatch strips use `overflow-x: auto` | Judged bounded sub-widgets rather than primary content under 1.4.10 — arguable either way | Already mitigated: scroll arrows + every swatch individually focusable |

**Editorial limit, not a code issue:** `img#img-car` alt is generated from state
(`"VW ID.7, Grenadilla Black Metallic, exterior view"`). Whether that accurately describes every
rotation frame is a **content** judgement that cannot be verified programmatically.

**What has not been tested at all:** real screen-reader output. The accessibility tree confirms what
is *exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. The defensible claim is:

> *"This component meets WCAG 2.2 A/AA on every automated and runtime check available, with five
> documented discretionary decisions, pending screen-reader verification."*

That is stronger than a tool-clean claim, and unlike a tool-clean claim it is true.

---

Each row lists a fallback that still conforms if the decision is rejected. None of these is a
failure; all five are places where a reasonable auditor could ask why.

---

# Source of truth

Criterion wording, Intent, Benefits, Examples, Techniques and ACT Rules for all 56 A/AA criteria:
`~/Documents/j-vault/md/wcag22-full-reference.md` — verbatim from W3C, diffed against the normative
spec (87/87 criteria, 0 level mismatches, 0.998 mean text fidelity on quoted normative text).
