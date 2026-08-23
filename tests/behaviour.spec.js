// Behavioural half — roughly half this component's accessibility lives in JS that
// no scanner executes. Every test below is a regression guard for a defect that was
// real, shipped, and scored clean by axe, Lighthouse and WAVE.
//
// Keys are driven through page.keyboard so they are real key events. element.click()
// would bypass the exact code paths that were broken.

const { test, expect } = require('@playwright/test');
const { settle, openA11yGroup, checkedIndex } = require('./settle');

test.describe('SC 4.1.2 — aria-expanded tracks reality', () => {
  test('#btn-info reports expanded when the auto-opened disclaimer is open', async ({ page }) => {
    await settle(page);
    // The disclaimer auto-opens on scroll. That path used to add is-open to the
    // panel without setting aria-expanded, so the trigger advertised "collapsed"
    // over an open panel from first paint until someone clicked it.
    const open = await page.evaluate(() =>
      document.getElementById('disclaimer').getBoundingClientRect().height > 0);
    const expanded = await page.locator('#btn-info').getAttribute('aria-expanded');
    expect(String(open), 'panel open state').toBe(expanded === 'true' ? 'true' : 'false');
  });

  test('aria-expanded stays truthful across a toggle cycle', async ({ page }) => {
    await settle(page);
    const btn = page.locator('#btn-info');
    const panelOpen = () => page.evaluate(() =>
      document.getElementById('disclaimer').getBoundingClientRect().height > 0);

    for (let i = 0; i < 2; i++) {
      await btn.click();
      await page.waitForTimeout(400);
      expect(String(await panelOpen())).toBe(await btn.getAttribute('aria-expanded'));
    }
  });

  test('Escape from inside the panel closes it and rehomes focus', async ({ page }) => {
    await settle(page);
    await page.evaluate(() => {
      const d = document.getElementById('disclaimer');
      if (!d.classList.contains('is-open')) document.getElementById('btn-info').click();
    });
    await page.waitForTimeout(400);
    // Focus must be INSIDE the panel: closeDisclaimer only rehomes focus when it
    // would otherwise be orphaned on a hidden element.
    await page.locator('#btn-close').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(await page.evaluate(() =>
      document.getElementById('disclaimer').getBoundingClientRect().height)).toBe(0);
    const active = await page.evaluate(() => document.activeElement.tagName);
    expect(active, 'focus was inside the closing panel, so it must be rehomed')
      .not.toBe('BODY');
  });

  test('Escape from outside the panel closes it and moves no focus', async ({ page }) => {
    await settle(page);
    await page.evaluate(() => {
      const d = document.getElementById('disclaimer');
      if (!d.classList.contains('is-open')) document.getElementById('btn-info').click();
    });
    await page.waitForTimeout(400);
    await page.locator('#select-model-lg').focus();
    const before = await page.evaluate(() => document.activeElement.id);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(await page.evaluate(() =>
      document.getElementById('disclaimer').getBoundingClientRect().height)).toBe(0);
    expect(await page.evaluate(() => document.activeElement.id),
      'focus was not inside the panel, so Escape must leave it alone').toBe(before);
  });
});

test.describe('radiogroup keyboard pattern', () => {
  for (const grid of ['grid-colour', 'grid-wheel']) {
    test(`${grid}: exactly one tab stop (roving tabindex)`, async ({ page }) => {
      await settle(page);
      const stops = await page.evaluate((g) =>
        [...document.querySelectorAll(`#${g} [role="radio"]`)]
          .filter((r) => r.tabIndex === 0).length, grid);
      expect(stops, 'a radiogroup is ONE tab stop, not one per radio').toBe(1);
    });

    test(`${grid}: ArrowRight moves and selects`, async ({ page }) => {
      await settle(page);
      const before = await checkedIndex(page, grid);
      await page.evaluate((g) =>
        document.querySelectorAll(`#${g} [role="radio"]`)[0].focus(), grid);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);

      const after = await checkedIndex(page, grid);
      expect(after, 'selection must follow focus within a radiogroup').toBe(1);
      expect(after).not.toBe(before === 1 ? after : before);

      const focusIdx = await page.evaluate((g) =>
        [...document.querySelectorAll(`#${g} [role="radio"]`)]
          .indexOf(document.activeElement), grid);
      expect(focusIdx).toBe(1);
    });

    test(`${grid}: Home and End jump to the ends`, async ({ page }) => {
      await settle(page);
      const n = await page.locator(`#${grid} [role="radio"]`).count();
      await page.evaluate((g) =>
        document.querySelectorAll(`#${g} [role="radio"]`)[0].focus(), grid);

      await page.keyboard.press('End');
      await page.waitForTimeout(350);
      expect(await checkedIndex(page, grid)).toBe(n - 1);

      await page.keyboard.press('Home');
      await page.waitForTimeout(350);
      expect(await checkedIndex(page, grid)).toBe(0);
    });

    test(`${grid}: ArrowLeft wraps from the first radio to the last`, async ({ page }) => {
      await settle(page);
      const n = await page.locator(`#${grid} [role="radio"]`).count();
      await page.evaluate((g) => {
        const r = document.querySelectorAll(`#${g} [role="radio"]`);
        r[0].focus(); r[0].click();
      }, grid);
      await page.waitForTimeout(350);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(350);
      expect(await checkedIndex(page, grid)).toBe(n - 1);
    });
  }

  test('Tab crosses a radiogroup in one step, not once per radio', async ({ page }) => {
    await settle(page);
    await page.evaluate(() => {
      document.activeElement && document.activeElement.blur();
      window.scrollTo(0, 0);
    });

    const seen = [];
    let first = null;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const s = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const v = document.getElementById('visualizer');
        return { sig: (a.id || a.className) + '|' + (a.getAttribute('aria-label') || '').slice(0, 20),
                 inVis: !!(v && v.contains(a)),
                 isRadio: a.getAttribute('role') === 'radio' };
      });
      if (!s) continue;
      if (first === null) first = s.sig; else if (s.sig === first) break;
      seen.push(s);
    }
    const radioStops = seen.filter((s) => s.inVis && s.isRadio).length;
    const groups = await page.evaluate(() =>
      [...document.querySelectorAll('#visualizer [role="radiogroup"]')]
        .filter((g) => g.querySelector('[role="radio"]')
          && getComputedStyle(g).display !== 'none').length);
    expect(radioStops, 'one stop per visible radiogroup').toBe(groups);
  });
});

test.describe('SC 4.1.3 — view changes are announced', () => {
  test('rotation writes to #media-status', async ({ page }) => {
    await settle(page);
    await page.evaluate(() => { document.getElementById('media-status').textContent = ''; });
    await page.locator('#media').focus();
    await page.keyboard.press('ArrowRight');
    // The write is debounced 600ms on purpose: holding the key steps every frame.
    await expect.poll(
      () => page.evaluate(() => document.getElementById('media-status').textContent),
      { timeout: 4000 },
    ).toMatch(/rotat/i);
  });

  test('zoom writes to #media-status', async ({ page }) => {
    await settle(page);
    await openA11yGroup(page);
    await page.evaluate(() => { document.getElementById('media-status').textContent = ''; });
    await page.locator('#btn-zoom-in').click();
    await expect.poll(
      () => page.evaluate(() => document.getElementById('media-status').textContent),
      { timeout: 4000 },
    ).toMatch(/zoom/i);
  });

  test('selecting a colour announces its name', async ({ page }) => {
    await settle(page);
    await page.evaluate(() =>
      document.querySelectorAll('#grid-colour [role="radio"]')[0].focus());
    await page.keyboard.press('ArrowRight');
    await expect.poll(
      () => page.evaluate(() => document.getElementById('label-colour').textContent.trim()),
      { timeout: 4000 },
    ).not.toBe('');
  });
});

test.describe('B14 — the wheel label is a button only while truncated', () => {
  test('role and aria-expanded are derived, not hardcoded', async ({ page }) => {
    await settle(page);
    const state = await page.evaluate(() => {
      const l = document.getElementById('label-wheel');
      if (!l) return null;
      return { role: l.getAttribute('role'), truncated: l.scrollWidth > l.clientWidth,
               expanded: l.getAttribute('aria-expanded'), tabIndex: l.tabIndex };
    });
    test.skip(state === null, 'no #label-wheel at this viewport');

    if (state.truncated) {
      expect(state.role, 'truncated label must be a button').toBe('button');
      expect(state.tabIndex).toBeGreaterThanOrEqual(0);
    } else {
      expect(state.role, 'untruncated label must expose no button role').not.toBe('button');
    }
  });
});
