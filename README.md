# VW Visualizer — accessibility reference build

A working example of the 360° car visualizer that meets WCAG 2.2 AA. **Use it as a guide to
behaviour, not as code to copy.** Most of what matters is in the JavaScript, not the markup.

**Live:** https://yikcunchung.github.io/vw-visualizer-prototype/

**Building the fullscreen mode?** Also read [`FULLSCREEN-A11Y.md`](FULLSCREEN-A11Y.md): what to build, the reason for each rule, and the tests.

---

## For the developer porting this: read this section

You need seven things. Everything else in this repo is evidence for auditors.

### 1. Keep the "open" state in sync everywhere the panel opens

The disclaimer panel also opens by itself when it scrolls into view. Set the button's
`aria-expanded` there too, not only in the click handler.

```js
if (entry.isIntersecting) { panel.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
```

**Why:** the auto-open was missed, so the button said "closed" over an open panel until someone
clicked it. Scanners did not catch it.

### 2. Radio groups need real keyboard handling

The swatches are radio buttons, so each group needs one tab stop, and the arrow keys, Home and End
must move between them. Setting the role does none of this by itself. Work out which swatch is
tabbable in one shared place, from which one is checked (`aria-checked`), so the six grids cannot
drift apart.

**Why:** every swatch was a tab stop and the arrow keys did nothing, although the screen reader
said to use them.

### 3. Announce every change, not only the ones that look broken

Zoom was announced to screen readers and rotation was not. Nothing looked wrong; it just stayed
silent. Wait 600ms before announcing, so a drag does not announce every frame.

```js
const announceRotation = debounce((deg) => { mediaStatus.textContent = `Rotated to ${deg} degrees`; }, 600);
```

**Why:** this only shows up when you use the control with a screen reader running.

### 4. Give the model select a visible label

Show a fixed "Model:" next to the current value, in two separate elements, and name the select
by both.

```html
<span class="select-label">
  <span id="model-static-label">Model: </span><span id="label-select-model-lg">ID.7</span>
</span>
<select id="select-model-lg" aria-labelledby="model-static-label label-select-model-lg">…</select>
```

**Why:** it only had an invisible label, so sighted users saw no description. Never rewrite the
"Model:" part; only the value changes. The box grows to fit the longer text, so no model name is
cut off.

### 5. Do not show selection with colour alone

The selected swatch gets a checkmark and a thicker border (1px to 3px), not just a different
colour (WCAG 1.4.1).

```css
.btn-swatch.selected .checkmark { display: block; }
.btn-swatch.selected .stroke    { border: 3px solid #997f67; }
```

### 6. Use real names for swatches

The five interior material swatches are still named `Material 1` to `Material 5`. Scanners accept
that, but it describes nothing. Production data (JSON or translation keys) can be empty, repeated
or wrong in the same way: four Grand California swatches once had the wrong colour name and every
tool passed. Check the data itself: names must be filled in, unique and descriptive.

### 7. Make the colour and wheel selectors fit the panel

The two selectors sit side by side and must never push the page into horizontal scrolling
(WCAG 1.4.10). Give each its natural width first. If they do not fit, the smaller one keeps its
full width and the larger one gets what is left and scrolls inside itself.

---

## How you know you are done

```bash
npm install
npm test
```

The tests run at four screen sizes (1440, 768, 390 and 320×256 at 400% zoom). They cover items
1–3 and 5, the scanner checks, and the fullscreen mode. Green means those are right. Items 4 and 6
are about structure and content, which tests cannot fully check, and item 7 has no test yet.

> Items 1–3 exist because the scanner found nothing wrong while each one was wrong. A clean scan
> does not prove this works. Pressing keys and listening with a screen reader does.

---

## Everything else in this repo

You do not need these to build. They let an auditor check the claims.

| File | What it is |
|---|---|
| [`a11y-3-implementation.md`](a11y-3-implementation.md) | The rules in full, by WCAG criterion, with the reasoning. |
| [`a11y-2-automated-testing.md`](a11y-2-automated-testing.md) | What the tools prove and what they cannot, the manual test steps, and the recorded results. |
| [`a11y-1-criteria.md`](a11y-1-criteria.md) | All 56 WCAG A/AA criteria, one row each, pass or fail. Look things up; do not read it through. |

## One deliberate difference from the core component

The core Select border, `rgb(161,164,172)`, has a contrast of 2.29:1, below the 3:1 minimum
(WCAG 1.4.11). This build uses `rgb(110,116,126)` (4.32:1) on purpose, so the prototype is fully
compliant instead of copying a known contrast bug. Do not change it back; that was tried and
reverted.
