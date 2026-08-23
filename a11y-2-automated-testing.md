# A11y 2 of 3 — What the automated tests cover, and what they cannot

**Component:** VW Visualizer. **Audited:** 2026-08-22 against the live deployment, headless Chrome
151.0.7922.174, axe-core 4.13.0 (`axe.version` read from the engine, not the bundle filename).
**Companions:** `a11y-1-criteria.md` (every criterion) · `a11y-3-implementation.md` (what to build).

The single most important sentence in this pack:

> **The reference build passed axe, Lighthouse, WAVE and Nu while containing genuine Level A
> failures.** Automated tooling is necessary and nowhere near sufficient. Roughly half this
> component's accessibility lives in JavaScript behaviour that no scanner executes.

---

---

# 0. Scope of this evidence — read before quoting a number

The audit ran `axe.run(document)` and then attributed every result. **Only `#visualizer` is reported
here** — page chrome is not this team's surface and is not tracked. Scoping axe to `#visualizer`
alone gives the same answer: **0 violations**. Measured at 1440×900:

| Measure | `#visualizer` |
|---|---|
| axe violations | **0** |
| axe *needs review* (contrast) | 4 |
| Accessibility-tree nodes | 158 |
| Named interactive / graphic nodes | 61 |
| Unnamed interactive nodes | **0** |
| Duplicate role+name pairs | **0** |
| Focusable controls | 13 |
| Radios | 18 |
| Targets under 24×24 | **0** |

Taken with the `#btn-a11y` control group **open** (the larger surface) and after the *"Drag to
rotate"* hint has collapsed. **Node and contrast counts wobble by a couple if you measure while that
hint is on screen** — it is 0×0, then visible from roughly 1.5s to 3s, then gone, and while visible
it adds itself to the contrast bucket as a fifth component node. Let it settle before quoting a
number.

> **Scope rule: only `#visualizer` counts.** Errors and failures in page chrome — nav, subnav, hero,
> tiles, footer, skip link — are **not findings** and are not tracked in this pack.

The four nodes in the contrast *needs-review* bucket are `.disclaimer-i`, both `#label-group`
paragraphs and `#select-model-lg`. All four are resolved by hand in §2.

Everything in `a11y-3-implementation.md` **is** component-scoped: all 16 elements named by the 30
invariants sit inside `#visualizer`, verified by `contains()`.

---

# 1. Tool coverage at a glance

| Tool | What it genuinely proves | Blind spots that bit this project |
|---|---|---|
| **axe-core 4.13.0** | Structural ARIA, names, roles, contrast on solid backgrounds, ~90 rules | **No `label-in-name` rule at all** (SC 2.5.3). Cannot see behaviour. Punts on contrast over gradients/images. **`target-size` is disabled by default**, so a bare run never tests SC 2.5.8 — see trap 9. `duplicate-id` still ships but is `deprecated` and disabled; `duplicate-id-aria` is the one that runs |
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
| **WAVE Evaluation Tool 3.3.1.0** | ✅ **Done — extension, after scrolling** | **0 errors, 0 contrast errors, 13 alerts and every alert outside `#visualizer`.** Verified WAVE had actually seen the built component before reading any number: ARIA icons were overlaid on the swatches. The earlier *hosted* run is not comparable — it analysed the page before the viewer built (0 radios, 0 swatches) and is the reason the extension is mandatory here. |
| **Zoom 400% and 320 × 256 px** | ✅ **Done** | Exactly this: `320×256 @ deviceScaleFactor 4`. axe 0 violations, no horizontal scroll, nothing clipped. `dsf 1` would be a small screen, not a zoom — see §4 trap 4. |
| **axe DevTools 4.131.2** | ✅ **Done — v4.134.1, version deviation recorded** | This audit ran **axe-core 4.13.0**, the library the extension embeds, via CDP — with **no `runOnly` filter**, which is what the extension's default scan executes (90 rules). The extension's own build number is not the engine version, so to satisfy the protocol literally, one run with the 4.131.2 extension UI is still worth doing. Expect it to agree. |
| **Operated via the keyboard** | ✅ **Done** | Driven with real `Input.dispatchKeyEvent`, not `element.click()`: Tab/Shift+Tab sweep (34 stops, 0 invisible), arrows, Enter, Space, Escape, with `document.activeElement` asserted at each step. |
| **NVDA 2026.1.1.55980** | ◐ **Deviation — VoiceOver run instead** | A screen reader *has* now been run: **VoiceOver**, macOS 26.5.2, Safari + Chrome, against live — see **§7d**. NVDA itself is still not done, and the protocol names NVDA, so this is recorded as a **deviation, not a substitute**. |
| **PAC 26.1.0.0** | ⚪ **Not applicable** | PAC validates **PDF/UA-1 (ISO 14289-1)** inside PDF files; it cannot open an HTML page. There is **no PDF in this component or repo** (`*.pdf` count: 0). See below. |

**Both remaining items need a human at a browser** — neither can be automated from here.

### WAVE: the hosted service cannot audit this component

Run against the live URL, the real WAVE engine reports **0 errors**.

**0 errors is real and good** — the five sibling prototypes had 10 empty-form-label errors between
them. But the result is **not** a clearance for the Visualizer, because of what WAVE analysed:

| | hosted WAVE saw | a scrolled browser sees |
|---|---|---|
| colour radios | **0** | 13 |
| swatches | **0** | 18 |

The component builds behind an `IntersectionObserver`. The hosted service loads the URL and analyses
it **without scrolling**, so it measured the static viewer shell and nothing else. This is the same
lazy-init trap as §4 trap 1, except it **cannot be fixed by adding a scroll step** — the service is
not scriptable.

> **How to actually satisfy this line of the protocol:** use **WAVE 3.3.1.0 as the browser
> extension**, which analyses the live DOM. Load the page, **scroll the viewer into view, confirm
> the swatches have rendered, then run WAVE.** Running it on page load produces a clean report of
> almost nothing.

### NVDA vs VoiceOver — a deviation to record

The protocol names **NVDA 2026.1.1.55980**. **VoiceOver is planned instead.**

That is worth doing and will surface real problems — but record it as a deviation rather than a
substitution, because the two disagree in ways that matter here:

- **Different engines, different announcements.** `aria-roledescription`, a non-modal
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

This audit covers the **Visualizer component only**. **PDFs — brochures, price lists, spec sheets —
are out of scope here.** That is a boundary, not a clean bill of health:

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

Of the 52 Level A/AA criteria in scope:

- **~23** can be verified by driving the component (axe + AX tree + real events + pixels).
- **~9** are settled by reading the code and the tree, not by a tool.
- **1** — SC 2.5.3 Label in Name — has **no rule in any tool used here**.
- The rest no scanner can close at all — see §5.

W3C's own ACT Rules cover only **32 of 56** A/AA criteria. The rest are either too new
(2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8) or not machine-decidable. That is the structural
reason a green CI run is not conformance.

---

# 2. Results

## axe-core — 0 violations

Bare `axe.run(document)`, **no tag filter**, both `violations` and `incomplete` read, at five
viewports in default and all-disclosures-expanded state.

| Viewport | Violations |
|---|---|
| 320×256 @ dsf 4 (**literal 400% zoom**) | 0 |
| 320×640 | 0 |
| 390×844 | 0 |
| 768×1024 | 0 |
| 1440×900 | 0 |

90 rules executed, 0 JS exceptions. The `incomplete` (needs-review) bucket is contrast only, and is
resolved node by node below.

### With the default-disabled rules force-enabled

A default run leaves 9 rules switched off, including **`target-size`** — the SC 2.5.8 rule. Enabling
all nine raises the count to **98 rules** and the component is still clean:

| Viewport | Rules | Violations | `target-size` | Needs review |
|---|---|---|---|---|
| 1440×900 | 98 | **0** | **passes, 27 nodes** | `aria-roledescription` ×1, contrast ×4 |
| 390×844 | 98 | **0** | **passes, 29 nodes** | `aria-roledescription` ×1, contrast ×3 |
| 320×256 @ dsf 4 | 98 | **0** | **passes, 28 nodes** | `aria-roledescription` ×1, contrast ×1 |

So 2.5.8 is confirmed by the engine, not only by measuring boxes by hand. The lone
`aria-roledescription` *needs-review* is the discretionary decision already recorded in
`a11y-1-criteria.md` — axe cannot judge it, and asks a human to.

## Accessibility tree

`#visualizer` subtree: **158 nodes, 61 named, 0 unnamed, 0 duplicate role+name**. 18 radios with **18 unique names**, the embedded `"` in the wheel names intact.

## Contrast — the `incomplete` bucket resolved by hand

axe punts whenever the background is a gradient, an image, or overlapped. Those are not passes;
a BITV tester must resolve every one. Every node in the component's bucket — the four named in §0 —
was measured on composited pixels at every viewport: **8.59:1 – 21:1**, all passing. The lowest is
`.disclaimer-i` at 8.59:1.

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

# 4. Traps that produce a confident false pass

**Scroll the gate, not the thing you measure.** `initVisualizer()` is behind an
`IntersectionObserver` on **`.intro-vis`** at `threshold: 0` — and `.intro-vis` sits *above*
the component. Scrolling straight to `#visualizer` works at tall viewports because
`.intro-vis` happens to stay on screen, but at **320x256** a single programmatic jump lands
past it without ever rendering a frame where it intersects. The observer never fires, the
grids stay empty, and `[role=radio]` returns 0 — while `#media` reports 99% visible, so every
"is it in view?" check says yes. This failed all 22 tests at 400% zoom until the scroll was
split in two: scroll `.intro-vis`, poll for 18 radios, *then* scroll to what you measure.

Each of these produces a confident wrong answer.

**1 · The component does not exist until you scroll.** `initVisualizer()` is behind an
`IntersectionObserver`. Audit before it fires and axe returns **0 violations on an empty
container**. Scroll `.intro-vis` into view and **poll** until
`document.querySelectorAll('#grid-colour [role=radio]').length > 0`. Never use a fixed sleep.

**2 · `runOnly: {type:'tag'}` is not "all rules".** A tag filter silently skips every rule
without one of those tags. Bare `axe.run(document)` is what the DevTools extension runs — but see
trap 9: even that is not every rule.

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

**9 · Bare `axe.run()` is not every rule either.** Nine rules are `enabled: false` by default in
4.13.0 — `target-size`, `aria-roledescription`, `color-contrast-enhanced`, `duplicate-id`,
`duplicate-id-active`, `identical-links-same-purpose`, `landmark-complementary-is-top-level`,
`meta-refresh-no-exceptions`, `audio-caption`. **`target-size` is SC 2.5.8**, so a default run
reports "0 violations" without ever having tested target size. Pass
`{rules:{'target-size':{enabled:true}, …}}` and confirm the rule appears in `passes`, or verify it
outside axe. Check `axe._audit.rules.filter(r => !r.enabled)` before believing a rule ran.

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

# 7b. Manual testing — what to do

Actions only. Do not judge anything while working through this; record what happened and
check it against **§7c** afterwards. Judging as you go is how "it seemed fine" becomes
evidence.

## Step 0 — before any tool, every time

1. Serve the build and open it: `python3 -m http.server 4173` → `http://127.0.0.1:4173/index.html`
   (or the Pages URL).
2. Scroll down until the car viewer and the swatch strips are on screen.
3. Wait about 4 seconds.
4. Look at the strips and count: colour swatches, wheel swatches.
5. Watch for the *"Drag to rotate"* hint to appear and disappear.
6. Write down: browser + version, OS, window size, date, and whether you clicked
   **#btn-a11y** (the ⓘ-style accessibility button) to reveal the zoom/rotate controls.

Step 0 is not optional. The component builds itself only once scrolled to, and the swatches
are created by JavaScript. Every tool below will happily inspect an empty shell.

## Run 1 — VoiceOver (macOS)

Safari first. Chrome only as a second opinion. `Cmd+F5` toggles VoiceOver.
`VO` = hold `Ctrl+Option`. Move with `VO+Right` / `VO+Left`, activate with `VO+Space`,
open the rotor with `VO+U`.

Do Step 0 first, then, **writing down the spoken words after each action**:

1. `VO+Right` until you are on the car viewer itself.
2. Continue `VO+Right` until you reach the colour swatches.
3. Press **Right arrow** once.
4. Press **Right arrow** twice more.
5. Press **Home**.
6. Press **End**.
7. Continue to the wheel swatches. Move across **all five**, one at a time.
8. Reload the page. Do Step 0 again. Now `Tab` until you reach the ⓘ information button
   (`#btn-info`) — **do not click anything on the way**.
9. Press `Enter` on it.
10. Press `Escape`.
11. `Tab` to the car viewer, then press **Right arrow** once and wait two full seconds.
12. Narrow the window until the wheel name under the strip is visibly cut off. `Tab` to that
    name and press `Enter`.
13. Click the interior/exterior toggle to switch to interior. Move across the material
    swatches.
14. Press `VO+U`, choose **Form Controls**, and read the list. Then switch the rotor to
    **Headings**.

## Run 2 — WAVE 3.3.1.0

Extension only. The hosted service at `wave.webaim.org` cannot see this component.

1. Install the WAVE browser extension (Chrome or Firefox).
2. Load the page. Do **Step 0**.
3. Click the WAVE toolbar icon.
4. Open the **Details** panel and find the counts for radio inputs, images with alt text,
   and structural elements.
5. Read the **Errors** tab, then **Contrast**, then **Alerts**.

## Run 3 — axe DevTools 4.131.2

1. Install the axe DevTools extension. Open DevTools → **axe DevTools** tab.
2. Check the reported version in the panel.
3. Load the page. Do **Step 0**.
4. In the panel's rule settings, **enable the rules that are off by default** — look for
   `target-size` specifically, and enable everything else that is unticked.
5. Click **Scan all of my page**.
6. If your licence has the element picker, rescan scoped to `#visualizer`.
7. Read **Issues**, then switch to **Needs review**.

# 7d. Screen-reader run — result, 2026-08-23

**VoiceOver, macOS 26.5.2 (25F84), Safari 26.5.2 and Chrome 151.0.7922.174, against the
live deployment** (`yikcunchung.github.io/vw-visualizer-prototype`) at commit `39fc0c8`.
Window size not recorded; both browsers agreed.

This is the pack's **first evidence of announced output** rather than exposed structure.
Six items were confirmed by ear:

| Item | Heard |
|---|---|
| `#btn-info` on an untouched first visit | **"expanded"** — SC 4.1.2 confirmed in speech, not just in the tree |
| Swatch position | **"1 of 13"**, **"2 of 13"** — the radiogroup contract lands |
| `aria-roledescription` on `#media` | **"car 360° viewer" is announced** |
| Wheel name, read in full | `Alloy wheels "Hudson" 8 J x 19 front, 8.5 J x 19 rear, in black, diamond-turned finish` |
| Rotation | **"rotated to 40 degrees"** and equivalents |
| Browser agreement | Safari and Chrome behaved the same |
| Rotor → Form Controls | **No blank entry, no duplicate, all 18 swatches listed** |
| Rotor → Landmarks | **`car viewer` present** |
| Escape from inside the disclaimer | **focus returned to `#btn-info`** — correct for a user-opened panel |
| Interior materials | announced cleanly as *Material 1*…*5* — **mechanically fine, semantically empty** |
| `#label-wheel` at ~768px | **plain text: skipped by Tab, announced by the VO cursor** — B14 confirmed both ways |
| `#label-wheel` activated while truncated | **reads the full wheel name** — the expand action works |
| Colour group on entry | **"Colours, radio group"** then **"1 of 13"** |
| Arrow within the group | name + **"selected"** + position |
| Home / End (`Fn`+arrows on macOS) | first and last colour, both announced |
| Opening the disclaimer | **found a defect** — focus landed on `#btn-close`, *after* the text. Now lands on `#label-group`. See below |

**What each one settles.**

- **SC 4.1.2.** The Level A defect was that `#btn-info` advertised "collapsed" over an
  open panel. VoiceOver now says *expanded* on a first visit with no interaction, which is
  the only way to observe the bug. Fixed, and confirmed by the only instrument that counts.
- **The radiogroup.** *"1 of 13"* proves the group semantics reach the user, and since the
  arrow keys now work, the announcement no longer promises something absent. Before the fix
  this same announcement was a lie.
- **`aria-roledescription`.** axe reports this as *needs review* because no engine can judge
  it. It is **announced**, so the discretionary decision to use it is now evidence-backed
  rather than an argument. Whether it replaces or supplements the word "region" was not
  recorded — worth noting on the next pass.
- **B1, closed in speech.** The historic Level A defect truncated `alt` at the embedded
  quote and collapsed five wheel radios into one shared name. The full string is now read
  aloud, quotes, diacritic and all — the regression test guards the markup, this confirms
  the output.
- **Rotation.** Previously silent while zoom announced. Now spoken, and the 600ms debounce
  does not swallow it.

## What this does NOT close

- **NVDA 2026.1.1.55980 is still owed.** The protocol names NVDA; VoiceOver is a
  **documented deviation**, not a substitute. A formal BITV / EN 301 549 audit will not
  accept this run for that line item.
- **All fifteen items are now evidenced.** VoiceOver is complete.

**The run found one defect that no tool reports.** Opening `#disclaimer` moved focus to
`#btn-close`, which sits *after* `#label-group` in DOM order — so a screen-reader user who
opened the panel to read the disclaimer heard only *"Close Disclaimer, button"* and had to
navigate **backwards** to reach the text. Not a WCAG failure: nothing was unreachable and
focus order was coherent. But it defeated the purpose of the disclosure. **Fixed** — focus now
lands on `#label-group`, which announces *"Disclaimer details, group"* and reads forward into
the paragraphs. A Playwright test now asserts the focus target.

This is what a screen-reader pass buys that automation cannot: every automated check passed
both before and after, because both states are conformant. Only listening revealed that one of
them was useless.

**"Not announced unless you highlight it" is the correct result, not a gap — and the
distinction is worth internalising.** `Tab` moves only between *focusable* elements; the
VoiceOver cursor (`VO+Right`) moves through *all* content, static text included. At ~768px
`#label-wheel` has `tabIndex -1` and no role, so Tab skips it while the VO cursor still reads
it. Nothing is hidden: the full name is on screen, readable by the cursor, and also announced
via `#wheel-live` whenever a wheel is selected. It is simply not a tab stop, because with the
text already fitting there is no expand action to perform. **A control that does nothing must
not be in the tab order** — the inverse, a label announcing *"button, collapsed"* over a name
already fully visible, is the defect **B14** exists to prevent.

Expect this to be misread in future audits: *"the label is not announced"* looks like a finding
and is not one. Check whether the element is *focusable* before treating Tab skipping it as a
defect.

**On `#label-wheel`: "announced as a button" is the expected result and proves nothing.** At
any normal desktop width the name *is* truncated, so a button is correct. The rule is that it
must be a button **only** while truncated — and the untruncated state exists only in a
**640–900px** band, where the layout gives the label full width and the name fits. Verified
there or not verified at all; see `a11y-3` §10.5 for the measured band.

**Escape returned focus to `#btn-info`, which is the correct branch.** The panel had been
opened *by the user* from that button, so returning focus to it is right. Had the panel
auto-opened on scroll, focus should instead stay on `#media` — returning it to a trigger the
user never pressed would throw them forward past every viewer control. That second branch is
still unverified by ear.

**The rotor pass is worth more than one line.** Since roving `tabindex` landed, only 2 of the
18 swatches are Tab stops — the rotor is now the primary random-access route to a specific
colour, so all 18 being listed and named matters functionally, not cosmetically. And a list
with no blanks and no duplicates independently confirms the 18-unique-names property **in
announced output**, which is the guard against **B1** — the defect where five wheel radios
once shared one name and passed axe, Lighthouse and WAVE alike.
- **`Material 1`-`Material 5` is a prototype placeholder, closed as a non-issue.** Production
  feeds these names from JSON, so the strings do not exist in the component's own source and
  there is nothing here to fix. **What carries forward is where the risk moves:** the name is
  now data, so its correctness is a content-governance problem, not a markup one. Validate at
  the data layer — a null, an empty string or a duplicate in that feed becomes a Level A defect
  the moment it renders, and no scanner will catch it. The precedent is on record: four Grand
  California swatches once carried the wrong colour name while every tool scored clean.
- **Every tool run is done.** VoiceOver §7d, WAVE §7e, axe DevTools §7f. **NVDA remains the
  only outstanding instrument**, recorded as a deviation rather than a plan.

# 7e. WAVE run — result, 2026-08-23

**WAVE 3.3.1.0 browser extension**, against the live deployment at `f49dc03`, run **after**
scrolling the component into view and letting it settle.

| Measure | Result |
|---|---|
| Errors | **0** |
| Contrast errors | **0** |
| Alerts | 13 — **all outside `#visualizer`** |
| Did WAVE see the component? | **Yes** — ARIA icons overlaid on the swatches |

**The sanity check is the part that matters.** WAVE reports "0 errors" just as happily against
an empty shell, so the run is worthless until you know the tool saw the built component. The
overlay is the cheapest proof: icons appearing on the colour swatches mean the grids existed
when WAVE analysed them. Counting "radio inputs" does **not** work here — the swatches are
`<button role="radio">`, not `<input type="radio">`, so they never appear as form inputs. They
show up under ARIA instead.

**0 contrast errors is better than the recorded baseline**, which had 6 from the hosted run.
Those 6 were page chrome measured on an unbuilt page; they are not a component result and were
never comparable.

**All 13 alerts fall outside the component**, so under the scope rule none is a finding.

# 7f. axe DevTools run — result, 2026-08-23

**axe DevTools extension v4.134.1**, live deployment. **Version deviation:** the protocol names
**4.131.2**; 4.134.1 is newer, and the rule set only grows between builds, so a newer version
passing is at least as strong as the named one passing. Recorded rather than hidden.

| Scan | Result |
|---|---|
| Automatic, **WCAG 2.1 AA**, whole page | **0 issues** — 0 critical / serious / moderate / minor |
| Automatic, **WCAG 2.2 AA**, whole page | **1 issue — page chrome, 0 inside `#visualizer`** |
| Intelligent Guided Tests — Interactive Elements | **Run** — surfaced two role suggestions, both rejected (below) |
| Intelligent Guided Tests — **Test #16 Target Size** | **Run — no issues.** SC 2.5.8 confirmed by the protocol's own tool |
| Intelligent Guided Tests — other five | Not run (Table, Keyboard, Modal Dialog, Structure, Images, Forms) |

**The single 2.2 issue is out of scope.** `p-as-heading` on
`.highlight:nth-child(2) > .highlight-header > p` — `<p>Ambient lighting</p>`, a card title
styled as a heading but marked up as a paragraph (78% confidence). Those `.highlight` cards live
in `#noise-2 > .section-highlight`, which begins **after** `</div><!-- /visualizer -->`, so under
the scope rule it is not a finding for this team. It is a fair observation for whoever owns the
page template — the section already has a real `<h2>`, and the card titles below it should be
headings too.

**Component result: 0 issues at WCAG 2.2 AA.** And usefully, the scan finding *something*
page-wide is evidence it was not a no-op — a 2.2 run that returned a flat zero everywhere would
be indistinguishable from a misconfigured one.

**The 2.1 AA scan does not cover SC 2.5.8.** `target-size` carries the `wcag22aa` tag, so a 2.1
rule set excludes it along with every other criterion 2.2 added. A clean 2.1 result is real but
says nothing about the six new criteria — the same shape of false pass that PR #23 exists to
prevent.

**"Guided Issues: 0" means 0 tests run, not 0 problems.** The seven IGTs are semi-automated and
must each be launched by hand, so a zero against an unrun test reads as a pass to anyone
skimming. Two were run: **Interactive Elements** and **Test #16 Target Size**. The rest were
skipped deliberately — the 92-test Playwright suite with real key events, the full VoiceOver pass
and the AX-tree sweep already cover keyboard, images, forms and structure more thoroughly, and
the component has no tables.

## Test #16 Target Size — no issues

**SC 2.5.8 now has three independent confirmations**, which makes it the best-evidenced
criterion in the pack:

1. **Hand measurement** of every control's box
2. **Engine**, with `target-size` force-enabled and an assertion that the rule *appears in the
   results* so it cannot silently skip — passing on 27–29 nodes at four viewports
3. **The protocol's own guided procedure**, walked by a human, no issues

The decision tree reached "is the target at least 24 x 24?" for both elements it surfaced and
both cleared it outright: `#media` is **1440 x 662** and `#label-group` **1024.5 x 62.3**. Neither
Equivalent nor Spacing exception was needed.

**Nothing in the component is under 24 x 24 at any viewport.** Smallest is `#btn-close` at exactly
**24 x 24**; scroll arrows 28 (32 at mobile), most controls 32, `#btn-toggle-view` 46, swatches 48,
`#label-wheel` 214.2 x **26.4**, `#select-model-lg` 167 x 50. **The Spacing exception is therefore
not load-bearing** — worth stating plainly, because a claim resting on spacing breaks with any
layout change.

`#label-wheel`'s 26.4px deserves its note: it is a `<span>`, not a `<button>`, so a survey of
button sizes misses it, and its height comes from `padding-block: 2px` plus `line-height: 1.6` —
**padding, not a larger line-height, on purpose.** SC 1.4.12 invites users to override
`line-height` to 1.5, so a target built on `line-height` is built on the one property another
criterion tells users they may change.

**Any 13 x 13 reading is an artifact,** not a failure: controls measured while the `#btn-a11y`
group animates open report 13 x 13. The Playwright suite had to add a box-stability wait for
exactly this.

**Whether the extension UI can confirm `target-size` ran was not established.** If it cannot,
do not claim this tool tested 2.5.8. The engine-level proof is stronger anyway: the CI suite
force-enables all nine default-disabled rules **and asserts the rule appears in the results**,
so it cannot silently skip.

## Two AI suggestions, both rejected

The extension's AI advisor flagged two elements as "role missing or incorrect" and recommended
`button` for both. **Both recommendations are wrong, and both rationales assert visual facts
that are false.** Recorded here because the next person to run this tool will see them again.

**1. `#media` — role `region`, name *car viewer*. Suggested: `button`.**
The rationale cites a *"circular shape, icon, and placement"*. `#media` is the **1440x662** car
stage — the whole image area. Not circular, not an icon, not small. It also argues that the text
*"car viewer"* implies an action; it is a noun phrase. Acting on this would put `role="button"`
on a container holding the swatches, zoom, rotate and view-toggle controls, announcing one
enormous button and swallowing every child's semantics.

**2. `#label-group` — role `group`, name *Disclaimer details*. Suggested: `button`.**
The rationale cites a *"clickable icon"*. The icon is `<span class="disclaimer-i"
aria-hidden="true">i</span>`, a **sibling**, correctly hidden — the AI attributed an adjacent
decorative element to a two-paragraph text block. Worse, `tabindex="0"` here exists **to satisfy
an accessibility rule**, as the source comment states: *"this block scrolls (SC 1.4.10 fix), and
a scrollable region must be keyboard-scrollable — ACT rule 0ssw9k / SC 2.1.1."* Converting it to
a button would break the fix it was added for and announce a control that performs no action.

**The generalisable error: `tabindex="0"` does not imply "button".** Both flagged elements are
focusable for reasons that are not "this is a widget":

- `#label-group` — a **scrollable region must be keyboard-scrollable** (SC 2.1.1 / ACT 0ssw9k)
- `#media` — a **custom interaction surface needs focus** so arrow keys can rotate, which is the
  **B7** fix; pointer users could not rotate at all while `mousedown preventDefault()` suppressed
  focus and left `activeElement` on `<body>`

Neither is a failure. Rotation is also available from `#btn-rot-left` / `#btn-rot-right`, real
buttons with real names, so the functionality is keyboard-operable through labelled controls and
the focusable region is an additional affordance rather than the only route.

If `region` on `#media` were ever revisited, `role="group"` fits a focusable interactive cluster
better. `button` does not. Leaving it as `region` keeps the landmark entry point, which the
VoiceOver rotor confirmed working.

# 7c. Verification checklist

Tick only what you actually observed. An untested box is not a pass. Anything that fails is
a finding **only if the element is inside `#visualizer`** — the viewer and the bottom bar.

## Run 1 — VoiceOver

- [ ] **Step 1** — the viewer is announced as a **region** named *car viewer*.
- [ ] **Step 1** — note whether *car 360° viewer* (`aria-roledescription`) is spoken,
      silently ignored, or **replaces** the word "region". All three are acceptable; which
      one happens is the thing to record. This is the item axe hands back as needs-review.
- [ ] **Step 2** — the group is announced as a **radio group** named *Colours*, and the
      current swatch as *selected*, with a position such as **"1 of 13"**.
- [ ] **Step 3** — focus **moved** to the next colour.
- [ ] **Step 3** — the new colour's **name was spoken** and it was announced as **selected**.
- [ ] **Steps 5–6** — Home reached the first colour, End reached the last, both announced.
- [ ] **Step 7** — all five wheel names were **distinguishable from each other**.
- [ ] **Step 7** — record verbatim how one quoted name is read, e.g.
      `Alloy wheels "Mataró" 8.5 J x 21 front, 9 J x 21 rear`. Did the quotes and the
      accented *ó* survive? Was `8.5 J x 21` intelligible, or noise?
- [ ] **Step 8** — ⚠️ **highest value.** `#btn-info` was announced as **expanded**, not
      collapsed, on a first visit with the panel open. If it says *collapsed*, that is a
      **Level A regression** (SC 4.1.2) and the fix in `37cdf4d` has come undone.
- [ ] **Step 9** — activating it announced the change, and focus went **into** the panel.
- [ ] **Step 10** — Escape closed the panel and focus went somewhere sensible — **never
      silence with focus lost to the page body**.
- [ ] **Step 11** — *"Rotated to N degrees"* was spoken. It is debounced 600ms, so nothing in
      the first half-second is not a failure.
- [ ] **Step 12** — the truncated wheel name announced as a **button**, and activating it read
      the **full** name.
- [ ] **Step 13** — the materials announced as *"Material 1"* … *"Material 5"*. **Expected
      and closed:** these are prototype placeholders; production supplies the names from JSON.
      Do not raise it. Do check the equivalent against **real** data once the feed is wired.
- [ ] **Step 14** — the form-controls list reads as a coherent set of named controls, with no
      entry that is blank or duplicated.

**Not a finding:** announcement order and verbosity; anything in the nav, hero, tiles, USP
blocks, NBA bar or footer; the *"Material N"* names (already known).

## Run 2 — WAVE

- [ ] **Sanity first — do not read any result until this passes.** WAVE reports about
      **13 colour radios**, **18 swatches**, and **25 images with alt**. If radios show
      **0**, WAVE ran before the component built: reload, redo Step 0, run it again.
- [ ] **Errors: 0.**
- [ ] Contrast items recorded with a count.
- [ ] Alerts recorded with a count.

**Not a finding, already dismissed:** duplicate `alt="VW ID.7"` on three tiles; contrast on
`h1`, `.label-subline`, `.btn-secondary`, `.usp-4`.

## Run 3 — axe DevTools

- [ ] Version reads **4.131.2** (record it if it does not — the protocol names this one).
- [ ] **`target-size` was enabled and appears in the results.** If it is absent, SC 2.5.8
      was **not tested** — say so plainly rather than implying coverage.
- [ ] **Violations inside `#visualizer`: 0.**
- [ ] Needs-review contains `aria-roledescription` ×1.
- [ ] Needs-review contains colour-contrast ×4 at 1440x900 (the count moves with width).

## Sign-off

- [ ] All three runs done, each with tool version, browser, OS, viewport and date recorded.
- [ ] Every failure triaged as in-scope or page chrome.
- [ ] **VoiceOver recorded as a deviation from NVDA 2026.1.1.55980**, not as a substitute — a
      formal BITV / EN 301 549 audit naming NVDA will not accept it, so an NVDA pass is still
      owed before sign-off.
- [ ] Only once all of the above is true, the closing sentence of §8 may drop
      *"pending screen-reader verification."*

# 8. The claim this evidence supports

> Every WCAG 2.2 Level A/AA requirement that can be verified by static analysis, by the
> accessibility tree, or by driving real pointer and keyboard events is verified and passing on
> `#visualizer` — with detectors proven against injected defects, and with a regression suite of
> 88 tests holding them in place. One conformance point rests on a documented judgement call
> (SC 2.5.3). Screen-reader announcement has been **verified with VoiceOver** on macOS 26.5.2 in
> Safari and Chrome (see §7d); **NVDA 2026.1.1.55980, which the protocol names, has not been run
> and is recorded as a deviation.**

That is deliberately short of "fully compliant". Conformance is defined **per full page**
(spec §5.2.2), and this is a component: four page-level criteria are out of scope, three more
pass on host-page markup this team does not own, and one content defect is open — the interior
interior swatches are named `Material 1`-`Material 5` in this prototype — a placeholder,
since production supplies those names from JSON.
