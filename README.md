# VW Visualizer — accessibility reference build

A working, WCAG 2.2 AA reference build of the 360° car visualizer. **It is a behavioural
specification, not source to copy.** Most of what matters here lives in JavaScript, not markup.

**Live:** https://yikcunchung.github.io/vw-visualizer-prototype/

---

## If you are the developer porting this — read this section only

You need **six things**. Everything else in this repo is evidence for auditors.

### 1. `aria-expanded` must be set wherever the panel opens, not just on click

```js
// ✗ wrong — only the click handler maintains it
btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(!open)));

// ✓ correct — the IntersectionObserver that auto-opens it must set it too
const obs = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { panel.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
});
```

**Why:** the disclaimer auto-opens on scroll into view. The click handler kept `aria-expanded`
correct for a manual toggle, but the auto-open path never touched it — so it read `"false"` over
an open panel from first paint until someone happened to click it. Every *other* state transition
maintained the attribute correctly, which is exactly why review missed this one.

### 2. `role="radio"` needs roving tabindex wired explicitly — the role alone promises nothing

```js
// One tab stop per group; arrows/Home/End move the roving tabindex and .click() the target
function wireRadiogroup(grid) {
  grid.addEventListener('keydown', e => {
    // ArrowRight/Down → next, ArrowLeft/Up → prev, Home → first, End → last
    // then: btns[next].click(); btns[next].focus();
  });
}
```

**Why:** all 13+ colour/wheel/material swatches shipped as `role="radio"` with `tabIndex="0"` on
every one — a screen reader announced "radio button, 1 of 13" and told the user to press arrow
keys, but nothing was listening, and all of them sat in the tab order. The role and the keyboard
contract it implies are two separate things; setting the role does not give you the second one for
free. Fixed by deriving roving tabindex from `aria-checked` via a single `MutationObserver` (there
are six grids and three different selector functions that mutate `aria-checked` — deriving tabindex
in one shared place is the only version that can't drift out of sync).

### 3. A silent state change is still a defect, even if nothing looks broken

```js
// Debounced — undebounced fires every frame during a drag
const announceRotation = debounce((deg) => { mediaStatus.textContent = `Rotated to ${deg} degrees`; }, 600);
```

**Why:** zoom level announced correctly; rotation did not. It wasn't obviously broken — nothing
threw, nothing looked wrong on screen — it just never spoke. `2.1.1`/`4.1.2` both technically passed
before this fix, so nothing here is caught by rule engines. It only surfaces by using the control
with a screen reader running.

### 4. A select's neighbouring text is its **value**, not its label — split the two, don't drop either

```html
<span class="select-label">
  <span id="model-static-label">Model: </span><span id="label-select-model-lg">ID.7</span>
</span>
<select id="select-model-lg" aria-labelledby="model-static-label label-select-model-lg">…</select>
```

**Why:** the control had `aria-label="Select car model"` — accurate, but invisible, so a sighted
user had no on-screen purpose description. The fix isn't "point the name at a static label
*instead of* the value" — it's both, in separate elements: a static "Model:" prefix nothing ever
rewrites, plus the existing family-value span. The name legitimately updates when the family does
("Model: ID.7" -> "Model: Grand California"); what must never happen is the *static* half moving
too, which is what a single JS-rewritten string would risk. The box itself is grid-stacked
(`.select-wrap { display: grid }`, label and native `<select>` sharing one cell) so its width tracks
whichever is wider — no family name truncates, even with the prefix added.

### 5. Selection state must not be color alone

```css
.btn-swatch.selected .checkmark { display: block; }     /* non-color signal */
.btn-swatch.selected .stroke    { border: 3px solid #997f67; }  /* 1px → 3px, not just a hue */
```

**Why:** SC 1.4.1. The selected swatch already changes border colour; a checkmark badge and a
border-*width* change (not just colour) mean the state doesn't depend on colour perception alone.

### 6. Swatch names must be the real variant name — not a numbered placeholder

The five interior material swatches are still named `Material 1`–`Material 5` in the data feeding
`makeSwatchBtn()`. Every scanner passes this (a name is present), but it describes nothing. This is
real content the visible design needs before it ships — not a code fix.

---

## How you know you are done

```bash
npm install
npm test
```

**92 tests over 4 viewports** (1440/768/390/320×256 @ dsf4). They encode items 1–3 and 5 above, plus
the scanner checks. Green means you have it — item 4 and item 6 are structural/content decisions
the tests don't and can't fully encode.

> **Items 1–3 exist because axe returned 0 violations while each was wrong.** A clean scanner run
> does not tell you this component works — pressing keys and listening to a screen reader does.

---

## Everything else in this repo

You do not need these to build. They exist so an auditor can verify the claim.

| File | Who it is for |
|---|---|
| [`a11y-3-implementation.md`](a11y-3-implementation.md) | The full version of the six rules, plus the rest of the 30 invariants (A1–A9, B1–B14, C1–C7). Read it if you want the reasoning. |
| [`a11y-2-automated-testing.md`](a11y-2-automated-testing.md) | What the tools prove and what they cannot, the manual test procedure, and the recorded results. |
| [`a11y-1-criteria.md`](a11y-1-criteria.md) | All 56 WCAG A/AA criteria, one row each, pass/fail. For the auditor. Look up a criterion; do not read it through. |

## A deliberate departure from the core component

The real core Select border, `rgb(161,164,172)`, is **2.29:1** against the page — below the
3:1 SC 1.4.11 floor. This build uses `rgb(110,116,126)` (**4.32:1**) instead: darker than the
core value on purpose, so the prototype demonstrates full outright compliance rather than
reproducing a known upstream contrast bug. Do not "correct" it back toward `rgb(161,164,172)`
— that direction was tried and reverted.
