// Fullscreen mode — keyboard, focus and containment. Every rule below is stated in
// FULLSCREEN-A11Y.md with the WCAG 2.2 Understanding page it comes from.
//
// #btn-fullscreen only renders below 960px, so these tests skip on desktop-1440.
// Keys go through page.keyboard (real key events). Fullscreen is entered with an
// in-page click, not locator.click(): Playwright scrolls the button into view first,
// and that scroll makes the disclaimer auto-open over the button again, which at a
// short viewport turns the click into a retry loop that never lands.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { settle } = require('./settle');

async function enterFullscreen(page) {
  await settle(page);
  test.skip(!(await page.locator('#btn-fullscreen').isVisible()), 'no #btn-fullscreen at this viewport');
  await page.evaluate(() => {
    closeDisclaimer();
    document.getElementById('btn-fullscreen').click();
    closeDisclaimer();   // entering can re-open it through the scroll observer
  });
  await page.waitForFunction(() => document.body.classList.contains('in-fullscreen'));
}

const inertIds = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[inert]')].map((e) => e.id || e.tagName));

const state = (page) => page.evaluate(() => ({
  fullscreen: document.body.classList.contains('in-fullscreen'),
  label: document.getElementById('btn-fullscreen').getAttribute('aria-label'),
  active: document.activeElement.id,
  disclaimerOpen: document.getElementById('disclaimer').classList.contains('is-open'),
}));

test.describe('fullscreen — exit and focus (SC 2.1.2, 2.4.3)', () => {
  test('Escape leaves fullscreen from inside the viewer and returns focus to the toggle', async ({ page }) => {
    await enterFullscreen(page);
    await page.evaluate(() => document.getElementById('media').focus({ preventScroll: true }));
    await page.keyboard.press('Escape');

    const s = await state(page);
    expect(s.fullscreen, 'Escape must leave fullscreen').toBe(false);
    expect(s.label, 'the toggle name follows the state').toBe('Enter fullscreen mode');
    expect(s.active, 'focus returns to the toggle').toBe('btn-fullscreen');
  });

  test('one Escape dismisses one thing: the disclaimer first, fullscreen on the next press', async ({ page }) => {
    await enterFullscreen(page);
    await page.evaluate(() => document.getElementById('btn-info').click());
    await page.waitForFunction(() => document.getElementById('disclaimer').classList.contains('is-open'));

    await page.keyboard.press('Escape');
    let s = await state(page);
    expect(s.disclaimerOpen, 'first Escape closes the disclaimer').toBe(false);
    expect(s.fullscreen, 'first Escape must not also leave fullscreen').toBe(true);

    await page.keyboard.press('Escape');
    s = await state(page);
    expect(s.fullscreen, 'second Escape leaves fullscreen').toBe(false);
  });

  test('the toggle button leaves fullscreen and keeps focus', async ({ page }) => {
    await enterFullscreen(page);
    await page.evaluate(() => document.getElementById('btn-fullscreen').focus({ preventScroll: true }));
    await page.keyboard.press('Enter');

    const s = await state(page);
    expect(s.fullscreen).toBe(false);
    expect(s.active).toBe('btn-fullscreen');
  });

  test('growing past 960px while in fullscreen leaves it, so the page is never left covered', async ({ page }) => {
    await enterFullscreen(page);
    await page.setViewportSize({ width: 1100, height: page.viewportSize().height });
    await page.waitForFunction(() => !document.body.classList.contains('in-fullscreen'));
    expect(await inertIds(page), 'nothing may stay inert behind a closed fullscreen').not.toContain('stage');
  });
});

test.describe('fullscreen — containment (SC 2.4.3, 2.4.11)', () => {
  test('Tab never reaches anything outside #visualizer, and inert is restored on exit', async ({ page }) => {
    await settle(page);
    test.skip(!(await page.locator('#btn-fullscreen').isVisible()), 'no #btn-fullscreen at this viewport');
    const before = await inertIds(page);

    await enterFullscreen(page);
    await page.evaluate(() => document.getElementById('btn-fullscreen').focus({ preventScroll: true }));
    const outside = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;          // focus left the page: the cycle wrapped
        return document.getElementById('visualizer').contains(a) ? 'in' : (a.id || a.tagName);
      });
      if (r === null) break;
      if (r !== 'in') outside.push(r);
    }
    expect(outside, 'focusable elements reached outside the viewer').toEqual([]);

    await page.keyboard.press('Escape');
    expect(await inertIds(page), 'only what was inert before may stay inert').toEqual(before);
  });
});

// The layout rule: in fullscreen the viewer is rotated 90deg, so the bottom bar's
// row is as wide as the screen is TALL. Portrait phones and tablets give it 800px
// and more. Landscape phones and 400% zoom give it 256-430px, and the colour and
// wheel sections collapse (measured 2026-10-14). These are known failures, kept as
// test.fail so the suite goes red the day they are fixed and the marker can go.
async function fullscreenFindings(page) {
  await enterFullscreen(page);
  await page.evaluate(() => document.getElementById('btn-fullscreen').focus({ preventScroll: true }));
  const problems = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const b = a.getBoundingClientRect();
      const w = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0));
      const h = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
      const shown = b.width * b.height ? (w * h) / (b.width * b.height) : 0;
      const top = document.elementFromPoint(
        Math.min(Math.max(b.left + b.width / 2, 0), innerWidth - 1),
        Math.min(Math.max(b.top + b.height / 2, 0), innerHeight - 1));
      const clear = !!top && (a === top || a.contains(top) || top.contains(a));
      return { id: a.id || a.getAttribute('aria-label') || 'swatch', ok: shown > 0.99 && clear };
    });
    if (!r) break;
    if (!r.ok) problems.push(r.id);
  }
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return { problems, violations: axe.violations.map((v) => v.id) };
}

test.describe('fullscreen — layout and focus visibility (SC 1.4.10, 2.4.7, 2.4.11, 2.5.8)', () => {
  test('portrait: every tab stop is fully visible and axe is clean', async ({ page }, testInfo) => {
    test.fail(testInfo.project.name === 'zoom-400',
      'known: at 320x256 @400% the bottom bar collapses in fullscreen (FULLSCREEN-A11Y.md, finding F1)');
    const found = await fullscreenFindings(page);
    expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
    expect(found.violations, 'axe violations in fullscreen').toEqual([]);
  });

  for (const [w, h] of [[844, 390], [640, 320]]) {
    test(`landscape ${w}x${h}: every tab stop is fully visible and axe is clean`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-390', 'one project is enough for explicit viewports');
      test.fail(true, 'known: landscape phones collapse the bottom bar in fullscreen (FULLSCREEN-A11Y.md, finding F1)');
      await page.setViewportSize({ width: w, height: h });
      const found = await fullscreenFindings(page);
      expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
      expect(found.violations, 'axe violations in fullscreen').toEqual([]);
    });
  }
});
