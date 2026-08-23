// The component defers its own construction behind an IntersectionObserver and
// injects the swatch grids from JS. Audit it before that and you measure an empty
// shell while every check passes — the most expensive trap in this codebase.
//
// Everything here polls for a real condition. Never substitute a fixed sleep:
// two honest runs will disagree.

const RADIO_TOTAL = 18; // 13 colour + 5 wheel, exterior

async function settle(page) {
  await page.goto('/index.html');

  // Guard against auditing the wrong document entirely.
  await page.waitForFunction(() => !!document.getElementById('visualizer'));

  // initVisualizer() is gated on an IntersectionObserver watching `.intro-vis`
  // (threshold 0), which sits ABOVE the component. Scroll straight to
  // #visualizer and at a short viewport the jump skips past .intro-vis without
  // ever rendering a frame where it intersects — the observer never fires and the
  // grids stay empty. Cost: every test at 320x256 failed until this was split in
  // two. Scroll the gate, wait for the build, then scroll to what you measure.
  await page.evaluate(() => {
    const gate = document.querySelector('.intro-vis');
    (gate || document.getElementById('visualizer'))
      .scrollIntoView({ block: 'center' });
  });

  // Built, not merely present: the radiogroups ship empty in the markup.
  await page.waitForFunction(
    (n) => document.querySelectorAll('#visualizer [role="radio"]').length >= n,
    RADIO_TOTAL,
    { timeout: 15_000 },
  );

  // Now bring the component itself into view for measurement.
  await page.evaluate(() =>
    document.getElementById('visualizer').scrollIntoView({ block: 'center' }));

  // Fonts and images must be resolved before any contrast assertion. Half-painted
  // text lets axe compute a background it otherwise cannot determine, which flips
  // colour-contrast findings from `incomplete` (needs review — the honest answer
  // over imagery) into hard `violations`. That produced a red suite with nothing
  // actually broken. Conditions, not sleeps.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('#visualizer img')];
    return imgs.length > 0 && imgs.every((i) => i.complete);
  }, null, { timeout: 15_000 });

  // "Drag to rotate" is 0x0, then visible ~1.5-3s, then gone. While visible it
  // adds AX nodes and puts itself in axe's colour-contrast incomplete bucket —
  // the whole difference between "4 needs review" and "5".
  await page.waitForFunction(() => {
    const hint = document.getElementById('hint-rotate');
    if (!hint) return true;
    return hint.classList.contains('hidden')
      || hint.getBoundingClientRect().height === 0;
  }, null, { timeout: 15_000 });

  return page.locator('#visualizer');
}

/** Open the #btn-a11y group — the larger control surface the audit is claimed at. */
async function openA11yGroup(page) {
  const btn = page.locator('#btn-a11y');
  if ((await btn.getAttribute('aria-expanded')) !== 'true') {
    await btn.click();
    await page.waitForFunction(
      () => document.getElementById('btn-a11y').getAttribute('aria-expanded') === 'true',
    );
  }
}

/** Radios in one group, in DOM order. */
function radios(page, grid) {
  return page.locator(`#${grid} [role="radio"]`);
}

async function checkedIndex(page, grid) {
  return page.evaluate(
    (g) => [...document.querySelectorAll(`#${g} [role="radio"]`)]
      .findIndex((r) => r.getAttribute('aria-checked') === 'true'),
    grid,
  );
}

/**
 * Wait until an element's box stops changing.
 *
 * The a11y group animates open, and a control measured mid-transition reports
 * 13x13 — not a real target-size failure, just a measurement taken too early.
 * Polls for two identical consecutive samples rather than asserting a size, so
 * this cannot mask a genuine failure.
 */
async function waitForStableBox(page, selector, tries = 25) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    }, selector);
    if (box !== null && box === last) return box;
    last = box;
    await page.waitForTimeout(80);
  }
  return last;
}

module.exports = {
  settle, openA11yGroup, radios, checkedIndex, waitForStableBox, RADIO_TOTAL,
};
