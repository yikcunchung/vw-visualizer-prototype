# A11y 2 of 3 — What the automated tests cover, and what they cannot

**Component:** VW Visualizer. **Audited:** 2026-08-21, headless Chrome 151, axe-core 4.13.0.
**Companions:** `a11y-1-criteria.md` (every criterion) · `a11y-3-implementation.md` (what to build).

The single most important sentence in this pack:

> **The reference build passed axe, Lighthouse, WAVE and Nu while containing genuine Level A
> failures.** Automated tooling is necessary and nowhere near sufficient. Roughly half this
> component's accessibility lives in JavaScript behaviour that no scanner executes.

---

---

# 0. Scope of this evidence — read before quoting a number

The audit ran `axe.run(document)` — **the whole page**, not just the component. That is a stronger
test, not a weaker one, but it means some figures describe page chrome the Visualizer team does not
own. Both scopes, measured at 1440×900:

| Measure | `#visualizer` only | Whole page |
|---|---|---|
| axe violations | **0** | **0** |
| axe rules executed | 89 | 90 |
| axe *needs review* (contrast) | 5 | 8 |
| Accessibility-tree nodes | 157 | 394 |
| Named interactive / graphic nodes | 33 | — |
| Unnamed interactive nodes | **0** | **0** |
| Duplicate role+name pairs | **0** | **0** |
| Focusable controls | 29 | 50 |
| Radios | 18 | 18 |

**The component passes on its own** — scoping axe to `#visualizer` still gives 0 violations.

> **Scope rule: only `#visualizer` counts.** Errors and failures in page chrome — nav, subnav, hero,
> `.usp-*`, tiles, NBA bar, footer, skip link — are **not findings** and are not tracked in this
> pack. The whole-page column above is **context only**: it shows the component is not being carried
> by a clean environment. Never quote it as a component result.

**Already dismissed as page chrome, do not re-raise:** contrast on `h1`, `.label-subline`,
`.btn-secondary` and `.usp-4`; WAVE's duplicate `alt="VW ID.7"` on three images. All measured, all
passing anyway, none of them this team's. The contrast nodes that *are* inside are `.disclaimer-i`,
both `#label-group` paragraphs and `#select-model-lg`.

Everything in `a11y-3-implementation.md` **is** component-scoped: all 16 elements named by the 29
invariants sit inside `#visualizer`, verified by `contains()`.

---

# 1. Tool coverage at a glance

| Tool | What it genuinely proves | Blind spots that bit this project |
|---|---|---|
| **axe-core 4.13.0** | Structural ARIA, names, roles, contrast on solid backgrounds, ~90 rules | **No `label-in-name` rule at all** (SC 2.5.3). Cannot see behaviour. Punts on contrast over gradients/images. `duplicate-id` was **removed** in 4.x — only `duplicate-id-aria` remains |
| **Lighthouse** | A subset of axe, plus perf/SEO | Scored **100** on a build with a Level A naming failure |
| **WAVE** | Empty labels, redundant `title`, sr-only contrast — things axe ignores | Needs a **public URL**. Reports `.sr-only` contrast as an error even when clipped to 1×1 |
| **Nu HTML validator** | Parse errors, invalid ARIA nesting | Says nothing about behaviour or contrast |
| **CDP `Accessibility.getFullAXTree`** | The real exposed tree: unnamed nodes, duplicate role+name | Shows what is *exposed*, never what is *announced* |
| **CDP `Input.dispatch*Event`** | Real keyboard and pointer behaviour — the half nothing else reaches | Synthetic keys do not fire native page scroll (see §4) |
| **Composited-pixel screenshots** | True contrast over gradients and imagery | Clip coordinates and anti-aliasing will lie to you (see §4) |

## Required toolchain — coverage against it

The audit protocol specifies these tools and conditions. Status of each against the Visualizer:

| Required | Status | Detail |
|---|---|---|
| **WAVE Evaluation Tool 3.3.1.0** | ◐ **Run — but it cannot see this component** | Real WAVE against the live URL: **0 errors**, 6 contrast, 9 alerts, 105 ARIA. But it analysed the page **before the viewer built** — 0 radios, 0 swatches, 7 of 25 images. Must be run as the **browser extension after scrolling**. See below. |
| **Zoom 400% and 320 × 256 px** | ✅ **Done** | Exactly this: `320×256 @ deviceScaleFactor 4`. axe 0 violations, no horizontal scroll, nothing clipped. `dsf 1` would be a small screen, not a zoom — see §4 trap 4. |
| **axe DevTools 4.131.2** | ◐ **Equivalent, not identical** | This audit ran **axe-core 4.13.0**, the library the extension embeds, via CDP — with **no `runOnly` filter**, which is what the extension's default scan executes (90 rules). The extension's own build number is not the engine version, so to satisfy the protocol literally, one run with the 4.131.2 extension UI is still worth doing. Expect it to agree. |
| **Operated via the keyboard** | ✅ **Done** | Driven with real `Input.dispatchKeyEvent`, not `element.click()`: Tab/Shift+Tab sweep (34 stops, 0 invisible), arrows, Enter, Space, Escape, with `document.activeElement` asserted at each step. |
| **NVDA 2026.1.1.55980** | ❌ **Not done** | The one real gap. **VoiceOver is planned instead** — see the deviation note below. |
| **PAC 26.1.0.0** | ⚪ **Not applicable** | PAC validates **PDF/UA-1 (ISO 14289-1)** inside PDF files; it cannot open an HTML page. There is **no PDF in this component or repo** (`*.pdf` count: 0). See below. |

**Both remaining items need a human at a browser** — neither can be automated from here.

### WAVE: the hosted service cannot audit this component

Run against the live URL, the real WAVE engine reports:

| error | contrast | alert | feature | structure | aria |
|---|---|---|---|---|---|
| **0** | 6 | 9 | 9 | 11 | 105 |

**0 errors is real and good** — the five sibling prototypes had 10 empty-form-label errors between
them. But the result is **not** a clearance for the Visualizer, because of what WAVE analysed:

| | hosted WAVE saw | a scrolled browser sees |
|---|---|---|
| colour radios | **0** | 13 |
| swatches | **0** | 18 |
| images with `alt` | **7** | 25 |

The component builds behind an `IntersectionObserver`. The hosted service loads the URL and analyses
it **without scrolling**, so it measured the page chrome and the static viewer shell and nothing
else. This is the same lazy-init trap as §4 trap 1, except it **cannot be fixed by adding a scroll
step** — the service is not scriptable.

> **How to actually satisfy this line of the protocol:** use **WAVE 3.3.1.0 as the browser
> extension**, which analyses the live DOM. Load the page, **scroll the viewer into view, confirm
> the swatches have rendered, then run WAVE.** Running it on page load produces a clean report of
> almost nothing.

The 9 alerts break down as `alt_duplicate ×2` and `heading_possible ×7`. The duplicate alt is
`"VW ID.7"` on **three** images, all **outside `#visualizer`** — page chrome, therefore **not a
finding** under the scope rule. Recorded only so nobody re-raises it.

### NVDA vs VoiceOver — a deviation to record

The protocol names **NVDA 2026.1.1.55980**. **VoiceOver is planned instead.**

That is worth doing and will surface real problems — but record it as a deviation rather than a
substitution, because the two disagree in ways that matter here:

- **Different engines, different announcements.** `aria-roledescription` (Part G), a non-modal
  `role="dialog"`, and a `<canvas role="img">` whose view changes as you pan are exactly the
  constructs where NVDA and VoiceOver diverge. A VoiceOver pass cannot predict the NVDA result for
  those three.
- **Different browser pairing.** NVDA is normally tested with Firefox or Chrome, VoiceOver with
  Safari. Safari's accessibility mapping differs independently of the screen reader.
- **A formal BITV / EN 301 549 audit that names NVDA will not accept VoiceOver evidence** for that
  line item.

**Practical read:** run VoiceOver now — it will catch genuine issues, and it is far better than no
screen-reader pass. Budget an NVDA pass before any formal sign-off.

### If PDFs are in scope elsewhere

This audit covers the **Visualizer component only**. Page chrome, video, and **PDFs — brochures,
price lists, spec sheets — are out of scope here.** That is a boundary, not a clean bill of health:

- Under **EN 301 549**, non-web documents fall under **clause 10**, separately from clause 9 (Web).
- WCAG conformance is defined **per full page** and **per complete process**, so a downloadable spec
  sheet inside a purchase journey is part of that process.
- **That is where PAC 26.1.0.0 belongs.** If VW ships PDFs, run PAC against them and track the
  result as a separate line item — nothing in this pack speaks to it.

### Other tools, and why they are absent

| Tool | Why not used |
|---|---|
| **ARC Toolkit · IBM Equal Access · Siteimprove · Tenon** | Same class as axe — rule engines over the DOM. A second scanner raises the rule count, not the confidence: the failures this project actually shipped were behavioural or semantic, which no DOM scanner detects. |
| **Colour Contrast Analyser (CCA)** | Superseded here by composited-pixel measurement. CCA needs a human to pick two colours; over a gradient or a photograph that choice is the whole question. |
| **Formal BITV-Test procedure** | A conformance *audit method*, not a tool. It consumes evidence like this pack; it does not replace it. |

---

## Which criteria are machine-decidable at all

Of the 56 Level A/AA criteria:

- **~23** can be verified by driving the component (axe + AX tree + real events + pixels).
- **~9** are settled by reading the code and the tree, not by a tool.
- **6** are site-level or untested and no scanner can close them.
- **1** — SC 2.5.3 Label in Name — has **no rule in any tool used here**.

W3C's own ACT Rules cover only **32 of 56** A/AA criteria. The rest are either too new
(2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) or not machine-decidable. That is the structural
reason a green CI run is not conformance.

---

# 2. Results

## axe-core — 0 violations

Bare `axe.run(document)`, **no tag filter**, both `violations` and `incomplete` read, at five
viewports in default and all-disclosures-expanded state.

| Viewport | Violations | Needs review |
|---|---|---|
| 320×256 @ dsf 4 (**literal 400% zoom**) | 0 | 4 contrast |
| 320×640 | 0 | 6 contrast |
| 390×844 | 0 | 7 contrast |
| 768×1024 | 0 | 7 contrast |
| 1440×900 | 0 | 8 contrast |

90 rules executed, 0 JS exceptions.

## Accessibility tree

Whole page: 394 nodes. `#visualizer` subtree: **157 nodes, 33 named interactive/graphic nodes,
0 unnamed, 0 duplicate role+name**. 18 radios with **18 unique names**, German quotes intact.

## Contrast — the `incomplete` bucket resolved by hand

axe punts whenever the background is a gradient, an image, or overlapped. Those are not passes;
a BITV tester must resolve every one. All **23** (across three viewports) were measured on
composited pixels: **8.59:1 – 21:1**, all passing. Lowest was `.disclaimer-i` at 8.59:1.

Of the eight distinct nodes, **four are page chrome** (`h1`, `.label-subline`, `.btn-secondary`,
`.usp-4`) and four are inside the component — see §0.

## Behaviour — driven with real events

Seven invariants that no scanner reaches, each driven with `Input.dispatchMouseEvent` /
`dispatchKeyEvent` rather than `element.click()`:

| Check | Result |
|---|---|
| Pointer actions fire on **up-event**, abortable by dragging off | Pass at 390 and 320 |
| Auto-rotation stoppable **by keyboard alone** | Pass — canvas hash frozen after `ArrowLeft` |
| Zoom announces and syncs on **all 8** paths | Pass |
| Panel focus in, and back to whoever opened it | Pass |
| Escape from outside the panel moves no focus | Pass |
| Focus ring ≥3:1 in default, hover **and** active | Pass — 8.61:1 on the tan fill |
| Focused control never behind a fixed bar | Pass — 20/20 controls, 0 occluders |

## Orientation and text spacing — the last two open criteria, tested 2026-08-21

**SC 1.3.4 Orientation — pass.** Tested portrait *and* landscape at 390×844 / 844×390 / 320×640 /
640×320, in normal and fullscreen mode. There is **no `@media (orientation:)` rule anywhere** in the
stylesheet. In all eight combinations: viewer and bottombar visible, 18 radios and 18 swatches
present, no horizontal scroll, and the fullscreen exit control visible **and inside the viewport**.
The `rotate(90deg)` is a user-invoked, reversible fullscreen mode — not an orientation lock.

**SC 1.4.12 Text Spacing — pass.** All four overrides applied together:

```css
*, *::before, *::after {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }
```

At 1440 / 390 / 320: **no newly clipped element, no control lost** (26→26, 28→28), **no horizontal
scroll**. The clipped set was *identical* before and after — compared by element identity, not by
string, because the dimensions in a label change even when the set does not:

| Element | Clipped? | Why it is not a loss |
|---|---|---|
| `#media-help` | before **and** after | The intentional 1×1 `.sr-only` clip. Nothing is rendered to lose. |
| `#label-wheel` | before **and** after | Truncates by design. Under the overrides it still **expands to fully visible** — all 86 characters, at every width. |

**Trap: measure after the reveal animation settles.** `revealSwatches()` animates swatches in from
`translateY(12px)` over ~0.45s with staggered delays. Measuring before it settles put the swatches
~9px low and produced **a phantom SC 2.5.8 failure at 390** (11.4px vs 12px required). The settled
value is 20.4px at every width. Poll until the label→swatch distance stops changing. This one nearly
went into the report as a real mobile failure.

**A finding that only appears with production data.** `#label-wheel` hardcodes
`role="button" tabindex="0"`. Swapping its text for a realistic short name (16 chars) at 1440 leaves
it **untruncated** — 214 = 214 — while the role, tabindex and `aria-expanded` all remain. In
production that is a focusable button with nothing to expand. No scanner would flag it, because the
markup is valid and the name is present; it needs the content swap to surface. See **B14**.

**Detector validated.** A deliberately clipped canary (`60px` box, `overflow:hidden`, a sentence far
too long) was injected and *was* detected. Without that, "no new clipping" would be an untested
claim — which is the same discipline as §3.

---

## Target size and reflow

Only one target under 24×24: `#label-wheel` at 17px tall, passing on the **spacing exception**
with 8.4px of slack, identical at 1440 / 390 / 320 and at 400% zoom. No horizontal scroll at 320 / 390 / 768 / 1440 or at 400% zoom.

---

# 3. Validate the harness before trusting a zero

**Every check above was re-run against a copy with that specific defect injected.** A detector
that cannot fail is not evidence. All seven fired:

| Injected defect | Detector output |
|---|---|
| Arrow fires on `pointerdown` | Scrolled on the down-event; drag-off no longer aborted |
| `stopAutoRotate()` removed from arrow keys | Still rotating after `ArrowLeft` |
| `syncZoomBtns()` removed from the key path | `OUT-OF-SYNC:[key-Enter-in, key-Space-in]` |
| `btnClose.focus()` removed | Focus stayed on the trigger |
| Focus-return guard replaced | Focus yanked to the trigger instead of the viewer |
| Hover/active ring rule deleted | **2.04:1** — exactly the predicted figure |
| `scroll-padding` zeroed + a fixed bar added | `FIXED-OCCLUDER` on every control |

Do the same in CI. If deleting a rule does not turn the suite red, the suite is decorative.

---

# 4. Eight traps that produce a confident false pass

Every one of these produced a wrong answer during this audit before being caught.

**1 · The component does not exist until you scroll.** `initVisualizer()` is behind an
`IntersectionObserver`. Audit before it fires and axe returns **0 violations on an empty
container**. Scroll `.intro-vis` into view and **poll** until
`document.querySelectorAll('#grid-colour [role=radio]').length > 0`. Never use a fixed sleep.

**2 · `runOnly: {type:'tag'}` is not "all rules".** A tag filter silently skips every rule
without one of those tags. Bare `axe.run(document)` is what the DevTools extension runs.

**3 · `violations` is not the whole result.** `incomplete` is the "needs review" bucket. Suppress
it and "axe 0" means far less than it sounds.

**4 · 400% zoom is `deviceScaleFactor: 4`.** `320×256 @ dsf 1` is a small screen — a different
test, and not the one 1.4.4 asks for.

**5 · `captureScreenshot` clip is document-absolute.** `getBoundingClientRect()` is
viewport-relative. Mixing them produced six false `1.00:1` contrast failures — the crops were
blank. Add `scrollX`/`scrollY`, or screenshot the viewport and crop in the image.

**6 · Anti-aliasing is not the background.** Taking the *worst* minority colour in a text crop
reported white-on-black text as 2.12:1 — it had found the button's white **border**. Use the
dominant background, and look at the crop before believing a failure.

**7 · A circle's bounding-box corners are outside the circle.** Sampling bbox corners reported
every 32px round button as occluded by the image behind it. Sample inside the shape.

**8 · Disabled controls cannot take focus.** `el.focus()` on a `disabled` button is a no-op, so
the page never scrolls and the control reads as "off-viewport". Enable it, or skip it.

Two more worth knowing: a **reused renderer stops firing the IntersectionObserver** after heavy
use — kill Chrome and start fresh if `initialised: false` appears twice. And **synthetic
`rawKeyDown` does not perform native default actions** such as page scroll; verify any
"page scroll was swallowed" finding against an unmodified build before reporting it.

---

# 5. What automation will never close

| Gap | Why no tool reaches it |
|---|---|
| **Screen-reader output** | The AX tree shows what is *exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. **NVDA 2026.1.1.55980** is named in the protocol and has not been run |
| **SC 2.5.3 Label in Name** | No rule exists in axe. A sibling VW prototype shipped a real Level A failure here that axe, Lighthouse **and** WAVE all passed |
| **Whether a name is *correct*** | Tools check that names are present and unique, never that they are true. Four Grand California swatches carried the wrong colour name while scoring clean |
| **Judgement calls** | 2.5.3 and 2.5.8 pass on arguable readings. A tool cannot weigh an exception |
| **Page-level criteria** | 2.4.5, 3.2.3, 3.2.4, 3.2.6 need more than one page |

---

# 6. Re-running the suite

```bash
# 1. serve the build, then drive a real browser over CDP
python3 -m http.server 7802 --bind 127.0.0.1
chrome --headless=new --remote-debugging-port=9714 --disable-gpu

# 2. STEP 0 — force the component to exist, and assert that it did
#    scrollIntoView('.intro-vis'), then poll:
#      document.querySelectorAll('#grid-colour [role=radio]').length > 0
#    ABORT the run if it never becomes > 0

# 3. axe: bare axe.run(document) — no runOnly. Read violations AND incomplete
# 4. AX tree: Accessibility.getFullAXTree -> assert 0 unnamed, 0 duplicate role+name
# 5. Real keys: Input.dispatchKeyEvent, assert document.activeElement after each
# 6. Reflow: Emulation.setDeviceMetricsOverride 320x256 @ dsf 4  (= 400% zoom)
# 7. Contrast: screenshot the VIEWPORT, crop in PIL, compare against the dominant bg
# 8. Re-run the whole suite against a deliberately broken copy. Every detector must fire.
```

**For CI:** `jest-axe` covers the structural half; Playwright with real key presses plus
`expect(page.locator(':focus'))` covers the behavioural half. Both are needed — the structural
half alone is what scored 100 on a build with a Level A failure.

---

# 7. Audit records

> **Note on the 2026-08-21 relabel and translation.** The wheel live region was moved off
> `#label-wheel` onto a `#wheel-live` sibling, resolving a Part G concern. The German wheel names —
> which were **long-text placeholders**, not content — were then translated to English and the two
> `lang="de"` attributes removed. No foreign-language passage remains, so SC 3.1.2 is now N/A.
>
> Re-verified after the translation: **18 radios / 18 unique names** with the embedded `"` intact,
> `#label-wheel` still 17px tall with 19.9–20.4px clearance (2.5.8 exception holds), axe 0 violations,
> 0 JS exceptions at 1440 / 390 / 320.
>
> **Keep a long string in the test data.** The longest name went from 100 to 90 characters, which is
> still long enough — but several findings here (2.5.8 target size, 1.4.10 reflow, the panel
> truncation bug) surfaced *only* because the fixture was that long. Short production names would
> hide them.


Dated evidence, kept so a later run can be diffed against this one rather than started from
scratch.

## Record — 2026-08-20 (`5dc4a90`, `index.html`)

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

---

## Record — 2026-08-21 (`27d1940` + uncommitted working tree)

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
