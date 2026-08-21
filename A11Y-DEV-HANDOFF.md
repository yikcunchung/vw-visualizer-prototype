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

`#label-wheel` is a `<span role="button" tabindex="0">`, 17px tall. It passes **SC 2.5.8 only via
the spacing exception** — the nearest other target centre is 48px away, and 24px is required. If
production tightens that layout it becomes a real failure. Ship it as a native `<button>` with a
≥24px target and the risk disappears.

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
