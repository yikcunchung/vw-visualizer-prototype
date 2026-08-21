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
| axe *needs review* (contrast) | 5 | 9 |
| Accessibility-tree nodes | 160 | 394 |
| Named interactive / graphic nodes | 41 | — |
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

`#visualizer` subtree: **160 nodes, 41 named, 0 unnamed, 0 duplicate role+name**. 18 radios with **18 unique names**, German quotes intact.

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

## Orientation and text spacing

**SC 1.3.4 Orientation — pass.** Portrait *and* landscape at 390×844 / 844×390 / 320×640 /
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

At 1440 / 390 / 320: **nothing clipped that was not already clipped, no control lost, no horizontal
scroll.** Compare the clipped set by element identity, not by string — the dimensions in a label
change even when the set does not:

| Element | Why it is not a loss |
|---|---|
| `#media-help` | The intentional 1×1 `.sr-only` clip. Nothing is rendered to lose. |
| `#label-wheel` | Truncates by design, and still **expands to fully visible** under the overrides — all 86 characters, at every width. |

**Trap: measure after the reveal animation settles.** `revealSwatches()` animates swatches in from
`translateY(12px)` over ~0.45s with staggered delays. Measuring before it settles put the swatches
~9px low, which manufactures a target-size failure that does not exist. Poll until the label→swatch
distance stops changing before trusting any geometry here.

**Detector validated.** A deliberately clipped canary (`60px` box, `overflow:hidden`, a sentence far
too long) was injected and *was* detected. Without that, "no new clipping" would be an untested
claim — which is the same discipline as §3.

---

## Target size and reflow

**No target is under 24×24.** `#label-wheel` — the only one that ever was — is 26.4px via
`line-height: 1.6` + `padding-block: 2px`, so nothing relies on the spacing exception. No horizontal
scroll at 320 / 390 / 768 / 1440 or at 400% zoom.

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

Each of these produces a confident wrong answer.

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

---

# 7. What automation cannot close

**Real screen-reader output has never been tested.** The accessibility tree proves what is
*exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. Several discretionary decisions
— `aria-roledescription` on the viewer, the non-modal `role="dialog"` panel, and a
`<canvas role="img">` whose view changes as you pan — can only be settled by listening.

The protocol names **NVDA 2026.1.1.55980**; **VoiceOver** is planned instead, which is a deviation
to record rather than a substitution (§1).

---

# 8. The claim this evidence supports

> Every WCAG 2.2 Level A/AA requirement that can be verified by static analysis, by the
> accessibility tree, or by driving real pointer and keyboard events is verified and passing on
> `#visualizer` — with detectors proven against injected defects. One conformance point rests on a
> documented judgement call (SC 2.5.3), and screen-reader announcement remains unverified.

That is deliberately short of "fully compliant", which no automated pass can establish.
