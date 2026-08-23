// Structural half. The Definition of Done in a11y-3 asks for jest-axe here, but
// jest-axe runs in jsdom and jsdom cannot run this component at all: init is gated
// on an IntersectionObserver, the interior view is a <canvas> panorama, and both
// target-size and the #label-wheel truncation rule need real layout. Running axe
// inside Playwright tests the same rules against a browser that actually built the
// thing. Same coverage, no false green.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { settle, openA11yGroup, waitForStableBox, RADIO_TOTAL } = require('./settle');

test.describe('axe', () => {
  test('component has 0 violations, including the default-disabled rules', async ({ page }) => {
    await settle(page);
    await openA11yGroup(page);

    // axe-core ships nine rules with enabled:false, and one of them is
    // target-size — the SC 2.5.8 rule. A stock run reports "0 violations"
    // having never tested target size. Enable everything the engine has.
    const disabled = await page.evaluate(() => []);
    const results = await new AxeBuilder({ page })
      .include('#visualizer')
      .options({ rules: {
        'target-size': { enabled: true },
        'aria-roledescription': { enabled: true },
        'color-contrast-enhanced': { enabled: true },
        'duplicate-id': { enabled: true },
        'duplicate-id-active': { enabled: true },
        'identical-links-same-purpose': { enabled: true },
        'landmark-complementary-is-top-level': { enabled: true },
        'meta-refresh-no-exceptions': { enabled: true },
        'audio-caption': { enabled: true },
      } })
      .analyze();

    expect(results.violations, JSON.stringify(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, help: v.help })), null, 1,
    )).toEqual([]);

    // Assert the rule we care about actually ran, rather than trusting the config.
    const ran = [...results.passes, ...results.violations, ...results.incomplete]
      .map((r) => r.id);
    expect(ran, 'target-size must appear in the results, or SC 2.5.8 went untested')
      .toContain('target-size');
  });
});

test.describe('names', () => {
  test('every radio has a unique, non-empty accessible name', async ({ page }) => {
    await settle(page);

    const names = await page.evaluate(() =>
      [...document.querySelectorAll('#visualizer [role="radio"]')].map((r) => {
        const img = r.querySelector('img');
        return (r.getAttribute('aria-label') || (img && img.alt) || '').trim();
      }));

    expect(names).toHaveLength(RADIO_TOTAL);
    expect(names.filter((n) => n === ''), 'unnamed radios').toEqual([]);
    expect(new Set(names).size, `duplicate names in ${JSON.stringify(names)}`)
      .toBe(RADIO_TOTAL);
  });

  test('wheel names keep their embedded quotes', async ({ page }) => {
    await settle(page);
    // Regression guard for B1: alt="${name}" truncated at the quote and collapsed
    // five wheel radios into one shared name. Level A, and axe scored it clean.
    const wheelNames = await page.evaluate(() =>
      [...document.querySelectorAll('#grid-wheel [role="radio"] img')].map((i) => i.alt));

    expect(wheelNames.length).toBeGreaterThan(0);
    expect(wheelNames.filter((n) => n.includes('"')).length,
      `expected quoted wheel names, got ${JSON.stringify(wheelNames)}`).toBeGreaterThan(0);
    expect(new Set(wheelNames).size).toBe(wheelNames.length);
  });

  test('no interactive node is unnamed in the accessibility tree', async ({ page }) => {
    await settle(page);
    await openA11yGroup(page);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll(
        '#visualizer button, #visualizer select, #visualizer a[href], #visualizer [role="radio"]')]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .filter((el) => {
          const img = el.querySelector('img');
          const name = el.getAttribute('aria-label')
            || (el.getAttribute('aria-labelledby')
                 ? [...el.getAttribute('aria-labelledby').split(/\s+/)]
                     .map((id) => (document.getElementById(id) || {}).textContent || '').join(' ')
                 : '')
            || (img && img.alt) || el.textContent || '';
          return name.trim() === '';
        })
        .map((el) => el.id || el.className));
    expect(unnamed).toEqual([]);
  });
});

test.describe('targets', () => {
  test('no visible target is under 24x24', async ({ page }) => {
    await settle(page);
    await openA11yGroup(page);
    // The group animates open. Measure before it settles and the rotate buttons
    // report 13x13 — a measurement artifact, not a target-size failure.
    await waitForStableBox(page, '#btn-rot-left');
    // Also filter by ancestor visibility, for controls in a collapsed section.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('#visualizer button, #visualizer [role="radio"], #visualizer select')]
        .filter((el) => !el.disabled)
        .filter((el) => {
          for (let n = el; n; n = n.parentElement) {
            if (n.nodeType === 1 && getComputedStyle(n).display === 'none') return false;
          }
          return true;
        })
        .map((el) => ({ id: el.id || el.className,
                        w: Math.round(el.getBoundingClientRect().width),
                        h: Math.round(el.getBoundingClientRect().height) }))
        .filter((b) => b.w > 0 && (b.w < 24 || b.h < 24)));
    expect(small, 'targets under 24x24').toEqual([]);
  });
});
