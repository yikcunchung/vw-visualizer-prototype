# A11y 2 of 3 — What the tools prove, and what they cannot

**Component:** VW Visualizer. **Audited:** 2026-08-22, re-verified and extended 2026-08-24 against
the live deployment, headless Chrome 151.0.7922.174, axe-core 4.13.0 (`axe.version` read from the
engine, not the bundle filename).
**Companions:** `a11y-1-criteria.md` (every criterion) · `a11y-3-implementation.md` (what to build).

**BLUF:** `#visualizer` is at **0 axe violations** across five viewports including literal 400% zoom,
with all nine default-disabled rules force-enabled. Every contrast *needs-review* node was resolved
by hand. The behaviour no scanner reaches was driven with real events, and every detector was proven
against an injected defect. All three manual tool runs are done. **NVDA is the only instrument still
owed.**

> **The one sentence that matters:** the reference build passed axe, Lighthouse, WAVE and Nu **while
> containing genuine Level A failures.** Tooling is necessary and nowhere near sufficient — roughly
> half this component's accessibility lives in JavaScript behaviour no scanner executes.

**How to read this:** §1–§5 explain what the tools can and cannot establish. §6–§8 are procedure —
follow them. §9 is the evidence record. §10 is the claim the evidence supports.

---

# 1. Scope — read before quoting a number

**Only `#visualizer` is reported here.** Page chrome is not this team's surface. Scoping axe to
`#visualizer` alone gives the same answer as the page-wide run: **0 violations**. At 1440×900:

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

Taken with `#btn-a11y` **open** (the larger surface) and after the *"Drag to rotate"* hint has
collapsed. That hint is 0×0, visible ~1.5–3s, then gone; while visible it adds itself to the contrast
bucket as a fifth node. **Let it settle before quoting any count.**

The four contrast nodes are `.disclaimer-i`, both `#label-group` paragraphs and `#select-model-lg`,
all resolved in §3.

> **Scope rule:** errors in page chrome — nav, subnav, hero, tiles, footer, skip link — are **not
> findings** and are not tracked. Everything in `a11y-3-implementation.md` is component-scoped: all
> 16 elements named by the 30 invariants sit inside `#visualizer`, verified by `contains()`.

---

# 2. Tool coverage

| Tool | What it genuinely proves | Blind spot that bit this project |
|---|---|---|
| **axe-core 4.13.0** | Structural ARIA, names, roles, contrast on solid backgrounds, ~90 rules | **No `label-in-name` rule at all** (SC 2.5.3). Cannot see behaviour. Punts on contrast over gradients. **`target-size` disabled by default** — trap 8 |
| **Lighthouse** | A subset of axe, plus perf/SEO | Scored **100** on a build with a Level A naming failure |
| **WAVE** | Empty labels, redundant `title`, sr-only contrast — things axe ignores | The **hosted** service cannot see this component at all; extension only |
| **Nu HTML validator** | Parse errors, invalid ARIA nesting | Silent on behaviour and contrast |
| **CDP `Accessibility.getFullAXTree`** | The real exposed tree: unnamed nodes, duplicate role+name | Shows what is *exposed*, never what is *announced* |
| **CDP `Input.dispatch*Event`** | Real keyboard and pointer behaviour — the half nothing else reaches | Synthetic keys do not fire native default actions — trap 9 |
| **Composited-pixel screenshots** | True contrast over gradients and imagery | Clip coordinates and anti-aliasing will lie — traps 5–7 |

## Required toolchain — status against the protocol

| Required | Status | Detail |
|---|---|---|
| **WAVE Evaluation Tool 3.3.1.0** | ✅ **Done** | Extension, after scrolling: **0 errors, 0 contrast errors, 13 alerts, every alert outside `#visualizer`** — §9.2 |
| **axe DevTools 4.131.2** | ✅ **Done** | v4.134.1, version deviation recorded. **0 issues in the component at WCAG 2.2 AA**, plus Test #16 Target Size — §9.3 |
| **Zoom 400% and 320×256 px** | ✅ **Done** | `320×256 @ deviceScaleFactor 4`. 0 violations, no horizontal scroll, nothing clipped. `dsf 1` would be a small screen, not a zoom — trap 4 |
| **Operated via the keyboard** | ✅ **Done** | Real `Input.dispatchKeyEvent`, not `element.click()`: Tab/Shift+Tab sweep, arrows, Enter, Space, Escape, `document.activeElement` asserted at each step |
| **NVDA 2026.1.1.55980** | ◐ **Deviation** | VoiceOver run instead — §9.1. **The one instrument still owed** |
| **PAC 26.1.0.0** | ⚪ **N/A** | PAC validates PDF/UA-1 inside PDFs; it cannot open an HTML page, and the repo has **0** PDFs |

### Why the hosted WAVE service cannot audit this component

Against the live URL it reports 0 errors — but it saw **0 colour radios and 0 swatches**, where a
scrolled browser sees **13 and 18**. The component builds behind an `IntersectionObserver`; the
hosted service loads the URL without scrolling, so it measured the static shell. **This cannot be
fixed by adding a scroll step — the service is not scriptable.** Use the extension, and confirm it
saw the swatches before reading any number.

### Why VoiceOver does not close the NVDA line

It surfaced real problems, including the disclaimer opening past its own content. It remains a
deviation because: the two engines diverge on exactly the constructs used here
(`aria-roledescription`, a non-modal `role="dialog"`, a `<canvas role="img">` whose view changes);
NVDA pairs with Firefox/Chrome and VoiceOver with Safari, whose mapping differs independently; and
**a formal BITV / EN 301 549 audit naming NVDA will not accept VoiceOver evidence.** Budget an NVDA
pass before sign-off.

### If PDFs are in scope elsewhere

Out of scope here — a boundary, not a clean bill of health. Under **EN 301 549** non-web documents
fall under **clause 10**, separately from clause 9. WCAG conformance is defined per full page *and
per complete process*, so a spec sheet inside a purchase journey is part of that process. **That is
where PAC belongs.** Nothing in this pack speaks to it.

### Tools deliberately not used

**ARC Toolkit · IBM Equal Access · Siteimprove · Tenon** — same class as axe. A second scanner raises
the rule count, not the confidence: the failures this project shipped were behavioural or semantic.
**Colour Contrast Analyser** — superseded by composited-pixel measurement; CCA needs a human to pick
two colours, and over a gradient that choice *is* the question. **Formal BITV-Test** — an audit
method, not a tool; it consumes evidence like this pack.

## How much is machine-decidable at all

Of the 52 A/AA criteria in scope: **~23** verifiable by driving the component, **~9** settled by
reading the code and tree, **1** (SC 2.5.3) with no rule in any tool used here, and the rest closable
by no scanner — see §5. W3C's own ACT Rules cover **32 of 56** A/AA criteria; the remainder are
either too new (2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8) or not machine-decidable. **That is the
structural reason a green CI run is not conformance.**

---

# 3. Results

## axe — 0 violations

Bare `axe.run(document)`, **no tag filter**, both `violations` and `incomplete` read, five viewports
in default and all-disclosures-expanded state. **90 rules, 0 JS exceptions.** The `incomplete` bucket
is contrast only.

| Viewport | Violations |
|---|---|
| 320×256 @ dsf 4 (**literal 400% zoom**) | 0 |
| 320×640 | 0 |
| 390×844 | 0 |
| 768×1024 | 0 |
| 1440×900 | 0 |

**With all nine default-disabled rules force-enabled — 98 rules, still clean:**

| Viewport | Rules | Violations | `target-size` | Needs review |
|---|---|---|---|---|
| 1440×900 | 98 | **0** | **passes, 27 nodes** | `aria-roledescription` ×1, contrast ×4 |
| 390×844 | 98 | **0** | **passes, 29 nodes** | `aria-roledescription` ×1, contrast ×3 |
| 320×256 @ dsf 4 | 98 | **0** | **passes, 28 nodes** | `aria-roledescription` ×1, contrast ×1 |

So **SC 2.5.8 is confirmed by the engine**, not only by measuring boxes. The lone
`aria-roledescription` needs-review is the discretionary decision recorded in `a11y-1-criteria.md` —
axe cannot judge it and asks a human to. **No target is under 24×24**; `#label-wheel`, the only one
that ever was, is 26.4px, so nothing relies on the spacing exception.

## Accessibility tree

**158 nodes, 61 named, 0 unnamed, 0 duplicate role+name.** 18 radios with **18 unique names**, the
embedded `"` in the wheel names intact.

## Contrast — the needs-review bucket resolved by hand

axe punts whenever the background is a gradient, an image, or overlapped. Those are not passes; a
BITV tester must resolve every one. All four component nodes measured on composited pixels at every
viewport: **8.59:1 – 21:1**, all passing, lowest `.disclaimer-i` at 8.59:1.

## Behaviour — driven with real events

Seven invariants no scanner reaches, each driven with `Input.dispatchMouseEvent` / `dispatchKeyEvent`
rather than `element.click()`:

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

**SC 1.3.4 — pass.** Portrait *and* landscape at 390×844 / 844×390 / 320×640 / 640×320, normal and
fullscreen. **No `@media (orientation:)` rule anywhere.** In all eight combinations: viewer and
bottombar visible, 18 radios and 18 swatches present, no horizontal scroll, fullscreen exit visible
and inside the viewport. The `rotate(90deg)` is user-invoked and reversible — not an orientation lock.

**SC 1.4.12 — pass.** All four overrides applied together:

```css
*, *::before, *::after {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }
```

At 1440 / 390 / 320: nothing clipped that was not already clipped, no control lost, no horizontal
scroll. **Compare the clipped set by element identity, not by string** — dimensions inside a label
change even when the set does not.

| Element | Why it is not a loss |
|---|---|
| `#media-help` | The intentional 1×1 `.sr-only` clip. Nothing rendered to lose |
| `#label-wheel` | Truncates by design, and still **expands to fully visible** under the overrides — all 86 characters, at every width |

**Measure after the reveal animation settles.** `revealSwatches()` animates swatches from
`translateY(12px)` over ~0.45s with staggered delays. Measuring early put them ~9px low, which
manufactures a target-size failure that does not exist. Poll until the label→swatch distance stops
changing.

---

# 4. Validate the harness before trusting a zero

**Every check above was re-run against a copy with that specific defect injected.** A detector that
cannot fail is not evidence. All seven fired:

| Injected defect | Detector output |
|---|---|
| Arrow fires on `pointerdown` | Scrolled on the down-event; drag-off no longer aborted |
| `stopAutoRotate()` removed from arrow keys | Still rotating after `ArrowLeft` |
| `syncZoomBtns()` removed from the key path | `OUT-OF-SYNC:[key-Enter-in, key-Space-in]` |
| `btnClose.focus()` removed | Focus stayed on the trigger |
| Focus-return guard replaced | Focus yanked to the trigger instead of the viewer |
| Hover/active ring rule deleted | **2.04:1** — exactly the predicted figure |
| `scroll-padding` zeroed + a fixed bar added | `FIXED-OCCLUDER` on every control |

A clipped canary (60px box, `overflow:hidden`, an over-long sentence) was also injected for 1.4.12
and *was* detected. Without it, "no new clipping" would be an untested claim.

**Do the same in CI. If deleting a rule does not turn the suite red, the suite is decorative.**

---

# 5. Nine traps that produce a confident false pass

**1 · Scroll the *gate*, not the thing you measure.** `initVisualizer()` sits behind an
`IntersectionObserver` on **`.intro-vis`** at `threshold: 0`, and `.intro-vis` is *above* the
component. Jumping straight to `#visualizer` works at tall viewports because `.intro-vis` stays on
screen, but at **320×256** a single programmatic jump lands past it without ever rendering an
intersecting frame. The observer never fires, the grids stay empty, `[role=radio]` returns **0** —
while `#media` reports 99% visible, so every "is it in view?" check says yes. This failed all 22
tests at 400% zoom. Scroll `.intro-vis`, **poll** until
`document.querySelectorAll('#grid-colour [role=radio]').length > 0`, *then* scroll to what you
measure. **Never a fixed sleep.**

**2 · `runOnly: {type:'tag'}` is not "all rules".** A tag filter silently skips every rule without
one of those tags. Bare `axe.run(document)` is what the DevTools extension runs — but see trap 8.

**3 · `violations` is not the whole result.** `incomplete` is the needs-review bucket a BITV tester
must resolve. Suppress it and "axe 0" means far less than it sounds.

**4 · 400% zoom is `deviceScaleFactor: 4`.** `320×256 @ dsf 1` is a small screen — a different test,
and not the one 1.4.4 asks for.

**5 · `captureScreenshot` clip is document-absolute**, `getBoundingClientRect()` is viewport-relative.
Mixing them produced six false `1.00:1` contrast failures on blank crops. Add `scrollX`/`scrollY`, or
screenshot the viewport and crop in the image.

**6 · Anti-aliasing is not the background.** Taking the *worst* minority colour in a text crop
reported white-on-black as 2.12:1 — it had found the button's white **border**. Use the dominant
background, and look at the crop before believing a failure.

**7 · A circle's bounding-box corners are outside the circle.** Sampling bbox corners reported every
32px round button as occluded by the image behind it. Sample inside the shape.

**8 · Bare `axe.run()` is not every rule either.** Nine rules are `enabled: false` in 4.13.0 —
`target-size`, `aria-roledescription`, `color-contrast-enhanced`, `duplicate-id`,
`duplicate-id-active`, `identical-links-same-purpose`, `landmark-complementary-is-top-level`,
`meta-refresh-no-exceptions`, `audio-caption`. **`target-size` is SC 2.5.8**, so a default run
reports "0 violations" without ever testing target size. Pass
`{rules:{'target-size':{enabled:true}, …}}` and **confirm the rule appears in `passes`**. Check
`axe._audit.rules.filter(r => !r.enabled)` before believing a rule ran.

**9 · Synthetic keys do not perform native default actions.** `rawKeyDown` fires no `keypress`, so a
native `<button>` never activates and Enter looks completely dead while Space works. Send the `char`
event too. Arrow keys are unaffected — which is the useful control: if arrows drive one widget but
not another in the same run, the second really has no handler. Likewise page scroll is not performed,
so verify any "scroll was swallowed" finding against an unmodified build.

**Also:** `el.focus()` on a `disabled` button is a no-op, so the page never scrolls and the control
reads as "off-viewport" — enable it or skip it. And a **reused renderer stops firing the
IntersectionObserver** after heavy use; kill Chrome and start fresh if `initialised: false` appears
twice.

---

# 6. What automation will never close

| Gap | Why no tool reaches it |
|---|---|
| **Screen-reader output** | The AX tree shows what is *exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*. **Closed by listening, not tooling** — VoiceOver run, §9.1; **NVDA remains owed** |
| **SC 2.5.3 Label in Name** | No rule exists in axe. A sibling VW prototype shipped a real Level A failure here that axe, Lighthouse **and** WAVE all passed |
| **Whether a name is *correct*** | Tools check names are present and unique, never that they are true. Four Grand California swatches carried the wrong colour name while scoring clean |
| **Judgement calls** | 2.5.3 and 2.5.8 pass on arguable readings. A tool cannot weigh an exception |
| **Discretionary ARIA** | `aria-roledescription` on the viewer, the non-modal `role="dialog"`, a `<canvas role="img">` whose view changes as you pan. axe hands the first back as needs-review precisely because it cannot judge it |

---

## Re-running the automated suite

`npm test` runs the committed Playwright suite — **92 tests over four viewports**, green in CI. That
is the maintained path. The CDP recipe below is what the original audit ran, kept because it explains
the *order* the steps must happen in:

```bash
# 1. serve the build, then drive a real browser over CDP
python3 -m http.server 7802 --bind 127.0.0.1
chrome --headless=new --remote-debugging-port=9714 --disable-gpu

# 2. STEP 0 — force the component to exist, and ASSERT that it did
#    scrollIntoView('.intro-vis'), then poll:
#      document.querySelectorAll('#grid-colour [role=radio]').length > 0
#    ABORT the run if it never becomes > 0
#
# 3. axe: bare axe.run(document), no runOnly, PLUS the nine disabled rules.
#    Read violations AND incomplete
# 4. AX tree: Accessibility.getFullAXTree -> assert 0 unnamed, 0 duplicate role+name
# 5. Real keys: Input.dispatchKeyEvent, assert document.activeElement after each
# 6. Reflow: Emulation.setDeviceMetricsOverride 320x256 @ dsf 4  (= 400% zoom)
# 7. Contrast: screenshot the VIEWPORT, crop, compare against the dominant bg
# 8. Re-run the whole suite against a deliberately broken copy. Every detector must fire.
```

**Why the suite does not use `jest-axe`:** it runs in jsdom, and jsdom cannot run this component at
all — init is gated on an `IntersectionObserver`, the interior view is a `<canvas>` panorama, and both
`target-size` and the `#label-wheel` truncation rule need real layout. axe runs **inside Playwright**
instead: same rules, a browser that actually built the thing, no false green.

---

# 7. Manual testing — what to do

Actions only, in the order you perform them. **Do not judge anything as you go** — write down
what happened and grade it against **§8** afterwards. Judging in the moment is how "it seemed
fine" becomes evidence.

Everything below is corrected against the runs recorded in §9. Several instructions in the
first draft of this section were wrong, and each mistake is called out so it is not repeated.

## Step 0 — before any tool, every single run

1. Decide **live or local**, and be deliberate:
   - **Live** — `https://yikcunchung.github.io/vw-visualizer-prototype/`. Use this if the evidence
     must describe what ships. **Verify it is current first:**
     `curl -s <url> | grep -c wireRadiogroup` → expect **3**. Pages lags a merge by 1–3 minutes.
   - **Local** — `python3 -m http.server 4173` → `http://127.0.0.1:4173/index.html`. Use this to
     test unmerged work. Hosted WAVE cannot reach localhost; the extension can.
2. **Scroll until the car viewer and the swatches are on screen.**
   The component builds itself behind an `IntersectionObserver` watching **`.intro-vis`**, which
   sits *above* the viewer, and the swatches are injected by JS. A single jump straight to the
   viewer can skip the gate entirely — at 320x256 that made every automated test fail while the
   viewer reported 99% visible. Scroll through, don't teleport.
3. **Wait about 4 seconds.**
4. **Count on screen: 13 colour swatches, 5 wheel swatches.** If you cannot see them, the tool
   will be looking at an empty shell.
5. **Watch the *"Drag to rotate"* hint appear and disappear.** While visible it adds a node to the
   contrast bucket, which is the whole difference between "4 needs review" and "5".
6. **Write down:** browser + version, OS version, window size, date, live or local, and whether
   you clicked **`#btn-a11y`** to reveal the zoom/rotate controls.

## Run 1 — VoiceOver (macOS)

Safari first, Chrome as a second opinion. `Cmd+F5` toggles VoiceOver. `VO` = `Ctrl+Option`.
Move `VO+Right` / `VO+Left`, activate `VO+Space`, rotor `VO+U`.

**On a Mac keyboard, Home and End are `Fn+Left` and `Fn+Right`.**

Do Step 0, then — **writing down the spoken words after each action:**

1. `VO+Right` until you are on the car viewer itself.
2. Continue until you reach the **row of 13 colour swatches** (the colour chips above the text
   line reading *"Colours — <name>"* in the bottom bar).
3. Press **Right arrow** once.
4. Press **Right arrow** twice more.
5. Press **Fn+Right** (End).
6. Press **Fn+Left** (Home).
7. Continue to the **5 wheel swatches**. Move across all five, one at a time.
8. **Reload. Redo Step 0.** Now `Tab` to the ⓘ information button (`#btn-info`, bottom right of
   the bottom bar) — **without clicking anything on the way.**
9. Press `Enter` on it.
10. `Tab` once, then press `Escape`.
11. `Tab` to the car viewer, press **Right arrow** once, and wait **two full seconds**.
12. **Resize the window to about 768px wide.** Navigate to the wheel name under the swatches.
13. Restore the window to desktop width. Navigate to that wheel name again and activate it.
14. Switch to interior with the view toggle. Move across the material swatches.
15. `VO+U` → **Form Controls**, arrow down the whole list. Then switch the rotor to **Landmarks**.

> **Step 12 needs the specific width.** Every wheel name is long enough to truncate at normal
> desktop sizes, so "narrow it until the text is cut off" is useless advice — it is *always* cut
> off. The label only *fits* between roughly **640 and 900px**, where the layout gives it full
> width. Outside that band, above and below, it truncates again. See `a11y-3` §10.5.

## Run 2 — WAVE 3.3.1.0

**Extension only.** The hosted service at `wave.webaim.org` loads the URL without scrolling, so
it analyses page chrome and an unbuilt shell — it recorded 0 radios and 0 swatches.

1. Install the WAVE extension (Chrome or Firefox).
2. Load the page. Do **Step 0**.
3. Click the WAVE toolbar icon.
4. **Confirm WAVE saw the built component before reading a single number.** Two ways:
   - **Its own overlay** — WAVE draws icons next to what it found. Look at the row of 13 colour
     chips. Icons on the swatches means it saw them. A bare swatch row while the nav and footer
     are covered in icons means it ran too early: reload, redo Step 0, run again.
   - **Details → ARIA** — the total should be around **100**. Single digits means an empty shell.
5. Read **Errors**, then **Contrast**, then **Alerts**.

> **Do not look for "radio inputs".** The swatches are `<button role="radio">`, not
> `<input type="radio">`, so WAVE never counts them as form inputs — you will read 0 and think it
> failed. They appear under **ARIA**. This instruction was wrong in the first draft.

## Run 3 — axe DevTools

1. Install the axe DevTools extension. DevTools → **axe DevTools** tab.
2. **Note the version.** The protocol names **4.131.2**. A newer build is fine — rule sets only
   grow, so a newer version passing is at least as strong — but **record the deviation** rather
   than leaving a reader to find the mismatch.
3. Load the page. Do **Step 0**.
4. ⚠️ **Set the standard to WCAG 2.2 AA.** The extension may default to **2.1 AA**, which excludes
   every criterion 2.2 added — including **`target-size`, the SC 2.5.8 rule**. A clean 2.1 result
   is real and says nothing about the six new criteria. This is the single most important step in
   this run.
5. In rule settings, **enable the rules that are off by default**, `target-size` above all. If the
   UI will not let you confirm which rules ran, record that — do not claim 2.5.8 was covered.
6. **Scan all of my page.**
7. Run the **Interactive Elements** guided test, then **Test #16 Target Size**.

> **Guided-test zeros are not passes.** The seven Intelligent Guided Tests are semi-automated and
> must each be launched by hand. An unrun test reports "Runs: 0, Total issues: 0", and the summary
> rolls that up as "Guided Issues: 0" — which reads as a clean sheet to anyone skimming an export.
> Record which ones you actually ran.

# 8. Verification checklist

Tick only what you observed. **An untested box is not a pass.** A failure is a finding **only if
the element is inside `#visualizer`** — the car viewer and the bottom bar.

## Run 1 — VoiceOver

- [ ] **1** — the viewer is announced as a **region** named *car viewer*.
- [ ] **1** — record whether *car 360° viewer* (`aria-roledescription`) is **spoken**, ignored, or
      **replaces** the word "region". No pass/fail — only what happened. This is the one item axe
      hands back as needs-review because no engine can judge it.
- [ ] **2** — announced as a **radio group** named *Colours*, with a position such as **"1 of 13"**.
- [ ] **3** — focus **moved**, the new colour's **name was spoken**, and it announced as
      **selected**. In a radiogroup, moving *is* choosing — without "selected" the user hears
      where they landed but not that the car repainted.
- [ ] **5–6** — Fn+Right reached the last colour, Fn+Left the first, both announced.
- [ ] **7** — all five wheel names were **distinguishable from each other**.
- [ ] **7** — record one quoted name **verbatim**, e.g. `Alloy wheels "Hudson" 8 J x 19 front,
      8.5 J x 19 rear, in black, diamond-turned finish`. Did the quotes and the accented character
      survive? Was `8 J x 19` intelligible, or noise? Unique and correct on paper can still be
      unusable aloud.
- [ ] **8** — ⚠️ **highest value.** `#btn-info` announced as **expanded** on a first visit with the
      panel open. **"Collapsed" is a Level A regression (SC 4.1.2)** and means the fix in `37cdf4d`
      has come undone. Note that *collapsed* also sounds perfectly unremarkable — you have to be
      listening for it.
- [ ] **9** — activating it moved focus **into** the panel, onto the **disclaimer text**, and the
      text is what gets read. Landing on the close button instead means the fix in `ff88b87` has
      regressed — that put focus *after* the content, so the user heard only "Close Disclaimer".
- [ ] **10** — Escape closed the panel and focus went somewhere real — **never silence with focus
      lost to `<body>`**. Focus returning to `#btn-info` is correct when *you* opened it; had it
      auto-opened on scroll, focus should stay on `#media` instead.
- [ ] **11** — *"Rotated to N degrees"* was spoken. Debounced 600ms, so silence in the first
      half-second is not a failure.
- [ ] **12** — at ~768px the wheel name is **plain text**: skipped by Tab, and announced only when
      the VO cursor lands on it. **That is correct, not a gap** — see the note below.
- [ ] **13** — at desktop width the same label announces as a **button**, and activating it reads
      the **full** name.
- [ ] **14** — materials announce as *"Material 1"*…*"Material 5"*. **Expected and closed** —
      placeholders; production supplies these from JSON. Do not raise it.
- [ ] **15** — rotor **Form Controls**: no blank entry, no duplicate, **all 18 swatch names
      present**. Rotor **Landmarks**: **`car viewer`** listed.

> **"Not announced unless you highlight it" is the correct result for plain text, not a finding.**
> `Tab` moves between *focusable* elements; the VoiceOver cursor moves through *all* content,
> static text included. At ~768px the wheel label has `tabIndex -1` and no role, so Tab skips it
> while the cursor still reads it. Nothing is hidden — the name is on screen, reachable by the
> cursor, and announced via `#wheel-live` on selection. **Check whether an element is focusable
> before treating Tab skipping it as a defect.**

> **Why the rotor sweep earns its place:** since roving `tabindex` landed, only 2 of the 18
> swatches are Tab stops, so the rotor is the primary random-access route to a specific colour. A
> list with no blanks and no duplicates also confirms the 18-unique-names property **in announced
> output** — the guard against **B1**, where five wheel radios once shared one name and passed
> axe, Lighthouse and WAVE alike.

**Not a finding:** announcement order and verbosity; anything in the nav, subnav, hero, `.usp-*`,
tiles, NBA bar or footer; the *"Material N"* names.

## Run 2 — WAVE

- [ ] **Sanity first — read nothing until this passes.** WAVE icons appear on the colour swatches,
      or Details → ARIA totals around 100. **Not** "radio inputs" — those are always 0 here.
- [ ] **Errors: 0.**
- [ ] Contrast count recorded.
- [ ] Alerts count recorded, each triaged as inside or outside `#visualizer`.

**Not a finding, already dismissed:** duplicate `alt="VW ID.7"` on three tiles; contrast on `h1`,
`.label-subline`, `.btn-secondary`, `.usp-4`.

## Run 3 — axe DevTools

- [ ] Version recorded, and any deviation from **4.131.2** stated.
- [ ] ⚠️ **Standard set to WCAG 2.2 AA, not 2.1.** A 2.1 scan cannot test SC 2.5.8.
- [ ] **Violations inside `#visualizer`: 0.**
- [ ] Each page-wide violation triaged. `p-as-heading` on the `.highlight` card titles is **page
      chrome** — those cards sit after `</div><!-- /visualizer -->`.
- [ ] Needs-review recorded: expect `aria-roledescription` ×1 and colour-contrast ×4–5. **If the
      panel never surfaces a needs-review bucket, say so** — a BITV tester must resolve it by hand.
- [ ] **Test #16 Target Size** run, and its verdict recorded.
- [ ] Which guided tests were run, and which were not, stated explicitly.

> **Expect two AI role suggestions, and reject both.** The advisor flags `#media` and
> `#label-group` as *"role missing or incorrect"* and recommends `button` for each. Both are wrong
> and both rationales assert visual facts that are false — it described the 1440x662 car stage as
> having a *"circular shape, icon and placement"*, and attributed a *"clickable icon"* to a
> two-paragraph text block whose icon is an `aria-hidden` sibling. `#label-group`'s `tabindex="0"`
> exists **to satisfy** ACT rule 0ssw9k / SC 2.1.1 — a scrollable region must be
> keyboard-scrollable — so the suggestion would break the fix it was added for. **`tabindex="0"`
> does not imply "button".** Full reasoning in §9.3.

> **A 13 x 13 target reading is an artifact.** Controls measured while the `#btn-a11y` group
> animates open report 13 x 13. Wait for the box to stop changing before believing it.

## Sign-off

- [ ] All three runs done, each with tool version, browser, OS, viewport, date and live-or-local.
- [ ] Every failure triaged as in-scope or page chrome.
- [ ] **VoiceOver recorded as a deviation from NVDA 2026.1.1.55980**, not a substitute — a formal
      BITV / EN 301 549 audit naming NVDA will not accept it, so an NVDA pass is still owed.
- [ ] Only once all of the above holds may §10 drop *"pending screen-reader verification"* — and
      **"fully compliant" remains unavailable regardless**: conformance is defined per full page
      (spec §5.2.2) and this is a component, four page-level criteria are out of scope, and three
      more pass on host-page markup this team does not own.

# 9. Manual run results

## 9.1 Screen reader — VoiceOver, 2026-08-24

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

### What this does NOT close

- **NVDA 2026.1.1.55980 is still owed.** The protocol names NVDA; VoiceOver is a
  **documented deviation**, not a substitute. A formal BITV / EN 301 549 audit will not
  accept this run for that line item.
**All fifteen checklist items are evidenced — VoiceOver is complete.**

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
- **Every tool run is done.** VoiceOver §9.1, WAVE §9.2, axe DevTools §9.3. **NVDA remains the
  only outstanding instrument**, recorded as a deviation rather than a plan.

## 9.2 WAVE, 2026-08-24

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

## 9.3 axe DevTools, 2026-08-24

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

### Test #16 Target Size — no issues

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

### Two AI suggestions, both rejected

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

# 10. The claim this evidence supports

> Every WCAG 2.2 Level A/AA requirement that can be verified by static analysis, by the
> accessibility tree, or by driving real pointer and keyboard events is verified and passing on
> `#visualizer` — with detectors proven against injected defects, and with a regression suite of
> 92 tests holding them in place, green in CI. One conformance point rests on a documented judgement call
> (SC 2.5.3). Screen-reader announcement has been **verified with VoiceOver** on macOS 26.5.2 in
> Safari and Chrome (see §9.1); **NVDA 2026.1.1.55980, which the protocol names, has not been run
> and is recorded as a deviation.**

That is deliberately short of "fully compliant". Conformance is defined **per full page**
(spec §5.2.2), and this is a component: four page-level criteria are out of scope, three more
pass on host-page markup this team does not own, and one content defect is open — the interior
interior swatches are named `Material 1`-`Material 5` in this prototype — a placeholder,
since production supplies those names from JSON.
