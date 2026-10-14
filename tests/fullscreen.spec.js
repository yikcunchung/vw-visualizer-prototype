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

// Layout. Portrait fullscreen turns the viewer 90deg, so the bottom bar's row is as
// wide as the screen is TALL; landscape fullscreen does not turn it, so the row is as
// wide as the screen is wide. Either way it needs 500px or more (measured 2026-10-14:
// 500 is clean, 430 loses swatch strips). Below that the button is not offered.
async function fullscreenFindings(page, { interior = false } = {}) {
  await enterFullscreen(page);
  if (interior) {
    await page.evaluate(() => { document.getElementById('btn-toggle-view').click(); closeDisclaimer(); });
    await page.waitForFunction(() => interiorMode === true);
  }
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

const isLandscapeLayout = (page) => page.evaluate(() =>
  getComputedStyle(document.getElementById('visualizer')).transform === 'none');

test.describe('fullscreen — layout and focus visibility (SC 1.4.10, 2.4.7, 2.4.11, 2.5.8)', () => {
  test('portrait: every tab stop is fully visible and axe is clean', async ({ page }) => {
    const found = await fullscreenFindings(page);
    expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
    expect(found.violations, 'axe violations in fullscreen').toEqual([]);
  });

  for (const [w, h] of [[844, 390], [932, 430], [640, 320], [568, 320], [500, 300]]) {
    test(`landscape ${w}x${h}: not turned, every tab stop fully visible, axe clean`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-390', 'one project is enough for explicit viewports');
      await page.setViewportSize({ width: w, height: h });
      const found = await fullscreenFindings(page);
      expect(await isLandscapeLayout(page), 'landscape must not be turned 90deg').toBe(true);
      expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
      expect(found.violations, 'axe violations in fullscreen').toEqual([]);
    });
  }

  for (const [w, h, dsf, what] of [[499, 300, 1, 'landscape under 500px wide'], [320, 256, 4, '400% zoom (320x256)'], [390, 499, 1, 'portrait under 500px tall']]) {
    test(`${what}: the button is not offered`, async ({ browser }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-390', 'one project is enough for explicit viewports');
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, baseURL: testInfo.project.use.baseURL });
      const page = await ctx.newPage();
      await settle(page);
      expect(await page.locator('#btn-fullscreen').isVisible(), 'a row under 500px loses swatch strips').toBe(false);
      await ctx.close();
    });
  }
});

test.describe('fullscreen — turning the phone (SC 1.3.4)', () => {
  // Rotation is simulated with setViewportSize, which re-evaluates media queries and
  // fires their change events like a real turn. The viewer must be on screen first:
  // the mode only follows a turn made while looking at it.
  async function viewerOnScreen(page) {
    await page.evaluate(() => document.getElementById('visualizer').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => viewerOnScreen === true);
  }
  const turn = async (page, landscape) => {
    const { width, height } = page.viewportSize();
    const [w, h] = landscape ? [Math.max(width, height), Math.min(width, height)] : [Math.min(width, height), Math.max(width, height)];
    await page.setViewportSize({ width: w, height: h });
  };

  test('turning to landscape enters fullscreen, not turned; turning back leaves', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    await settle(page);
    await viewerOnScreen(page);
    expect((await state(page)).fullscreen).toBe(false);

    await turn(page, true);
    await page.waitForFunction(() => document.body.classList.contains('in-fullscreen'));
    expect(await isLandscapeLayout(page), 'landscape fullscreen is not turned 90deg').toBe(true);
    expect((await state(page)).label).toBe('Exit fullscreen mode');

    await turn(page, false);
    await page.waitForFunction(() => !document.body.classList.contains('in-fullscreen'));
    expect(await inertIds(page), 'nothing may stay inert after it leaves').not.toContain('stage');
  });

  test('loading the page in landscape does not cover it', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, baseURL: testInfo.project.use.baseURL });
    const page = await ctx.newPage();
    await settle(page);
    await page.waitForTimeout(500);
    expect((await state(page)).fullscreen, 'only a turn enters it').toBe(false);
    await ctx.close();
  });

  test('turning to landscape moves focus in when it was left outside the viewer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    await settle(page);
    await viewerOnScreen(page);
    // The skip link sits outside #visualizer and goes inert with everything else; a
    // focus left on it would drop to <body> and the next Tab would start at the top.
    await page.evaluate(() => document.querySelector('.skip-link').focus({ preventScroll: true }));
    expect(await page.evaluate(() => document.getElementById('visualizer').contains(document.activeElement))).toBe(false);

    await turn(page, true);
    await page.waitForFunction(() => document.body.classList.contains('in-fullscreen'));
    expect((await state(page)).active, 'focus moves to the toggle').toBe('btn-fullscreen');
  });

  test('leaving landscape fullscreen with Escape sticks until the next turn', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    await settle(page);
    await viewerOnScreen(page);
    await turn(page, true);
    await page.waitForFunction(() => document.body.classList.contains('in-fullscreen'));

    await page.evaluate(() => closeDisclaimer());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    let s = await state(page);
    expect(s.fullscreen, 'Escape leaves it').toBe(false);
    expect(s.active, 'focus returns to the toggle').toBe('btn-fullscreen');

    await turn(page, false);
    await viewerOnScreen(page);
    await turn(page, true);
    await page.waitForFunction(() => document.body.classList.contains('in-fullscreen'));
  });

  test('the drag axis follows the layout: horizontal in landscape, vertical when turned', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    const framesMoved = async (dx, dy) => {
      const box = await page.locator('#media').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const before = await page.evaluate(() => rotFrame);
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy + dy, { steps: 8 });
      await page.mouse.up();
      return (await page.evaluate(() => rotFrame)) !== before;
    };

    await page.setViewportSize({ width: 844, height: 390 });
    await enterFullscreen(page);
    expect(await framesMoved(120, 0), 'landscape: horizontal drag rotates').toBe(true);
    expect(await framesMoved(0, 120), 'landscape: vertical drag does not').toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await enterFullscreen(page);
    expect(await framesMoved(0, 120), 'turned: vertical drag rotates').toBe(true);
    expect(await framesMoved(120, 0), 'turned: horizontal drag does not').toBe(false);
  });
});

test.describe('fullscreen — interior view (SC 2.4.7, 2.4.11, 2.5.1, 2.5.7)', () => {
  test('portrait: every tab stop is fully visible and axe is clean', async ({ page }) => {
    const found = await fullscreenFindings(page, { interior: true });
    expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
    expect(found.violations, 'axe violations in fullscreen').toEqual([]);
  });

  for (const [w, h] of [[844, 390], [640, 320], [500, 300]]) {
    test(`landscape ${w}x${h}: every tab stop is fully visible and axe is clean`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-390', 'one project is enough for explicit viewports');
      await page.setViewportSize({ width: w, height: h });
      const found = await fullscreenFindings(page, { interior: true });
      expect(found.problems, 'tab stops hidden or covered in fullscreen').toEqual([]);
      expect(found.violations, 'axe violations in fullscreen').toEqual([]);
    });
  }

  // Portrait fullscreen turns the viewer 90deg clockwise, so a drag down the screen is
  // a drag right across the panorama. 390x844 turned and 844x390 are the same 844x280
  // canvas, so the same drag in each must leave identical pixels. The panorama starts
  // from its reset view with auto-rotation stopped, so nothing else moves it.
  test('the panorama drag follows the layout: the same drag gives the same view turned or not', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'explicit viewports');
    const view = async (w, h, dx, dy) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, baseURL: testInfo.project.use.baseURL });
      const page = await ctx.newPage();
      await enterFullscreen(page);
      await page.evaluate(() => { document.getElementById('btn-toggle-view').click(); closeDisclaimer(); });
      await page.waitForFunction(() => interiorMode === true);
      await page.evaluate(() => { stopAutoRotate(); pano.reset(); pano.pan(0, 0); });
      await page.waitForTimeout(300);
      const box = await page.locator('#media').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const out = await page.evaluate(() => ({ url: pano.canvas.toDataURL(), size: pano.canvas.width + 'x' + pano.canvas.height }));
      await ctx.close();
      return out;
    };
    const landscape = await view(844, 390, 100, 0);
    const turned = await view(390, 844, 0, 100);
    expect(turned.size, 'both layouts must give the same canvas').toBe(landscape.size);
    expect(turned.url, 'a drag down the turned screen is a drag right across the panorama').toBe(landscape.url);
  });
});
