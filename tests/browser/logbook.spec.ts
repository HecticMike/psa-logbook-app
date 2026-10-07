import { expect, test, type Page } from '@playwright/test';
async function nav(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: /navigation/ })
    .filter({ visible: true })
    .getByRole('button', { name: label, exact: true })
    .click();
}
async function seed(page: Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('psa-logbook-db');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const now = Date.now();
    for (let i = 0; i < 18; i++)
      store.put({
        id: 'sample-' + i,
        startAt: now - (i * 1.4 + 0.1) * 86400000,
        pain: [4, 6, 3, 7, 5, 2][i % 6],
        region: i % 3 === 0 ? 'Hands' : 'Feet',
        regionKey: i % 3 === 0 ? 'hands' : 'feet',
        jointKey: i % 3 === 0 ? 'finger-1-middle' : 'ankles',
        symptomKey: 'pain',
        symptomKeys: i % 2 ? ['pain', 'stiffness'] : ['pain', 'swelling'],
        side: i % 3 ? 'right' : 'left',
        notes: i % 2 ? 'A little stiff when walking this morning.' : 'Noticed after a busy afternoon.',
        createdAt: now,
        updatedAt: now
      });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
}
test.beforeEach(async ({ page }) => {
  await page.route('https://accounts.google.com/**', (route) => route.abort());
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Your overview', exact: true })).toBeVisible();
  await expect(page.getByText('Opening your logbook…')).not.toBeVisible();
});
test('diagram logging, multiple symptoms, edit cancellation, and reload persistence', async ({
  page
}, info) => {
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.screenshot({ path: 'test-results/body-' + info.project.name + '.png', fullPage: true });
  await page.locator('.location-picker').screenshot({ path: 'test-results/body-front-' + info.project.name + '.png' });
  await page.getByRole('button', { name: 'Hands & wrists', exact: true }).first().click();
  await page.getByRole('button', { name: 'Left', exact: true }).click();
  const leftThumb = await page.getByRole('button', { name: 'Thumb', exact: true }).first().boundingBox();
  const leftLittleFinger = await page.getByRole('button', { name: 'Little finger', exact: true }).first().boundingBox();
  expect(leftThumb!.x).toBeLessThan(leftLittleFinger!.x);
  await expect(page.locator('.digit-image')).not.toHaveClass(/art-mirrored/);
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  const rightThumb = await page.getByRole('button', { name: 'Thumb', exact: true }).first().boundingBox();
  const rightLittleFinger = await page.getByRole('button', { name: 'Little finger', exact: true }).first().boundingBox();
  expect(rightThumb!.x).toBeGreaterThan(rightLittleFinger!.x);
  await expect(page.locator('.digit-image')).toHaveClass(/art-mirrored/);
  await page.locator('.location-picker').screenshot({ path: 'test-results/hand-right-' + info.project.name + '.png' });
  await page.getByRole('button', { name: 'Left', exact: true }).click();
  await page.getByRole('button', { name: 'Thumb', exact: true }).first().click();
  await expect(page.locator('.digit-artwork img')).toHaveAttribute('src', /thumb\.png$/);
  await page.getByRole('button', { name: 'Index finger', exact: true }).click();
  await expect(page.locator('.digit-artwork img')).toHaveAttribute('src', /finger\.png$/);
  await page.getByRole('button', { name: 'Middle joint', exact: true }).click();
  await page.screenshot({ path: 'test-results/hand-' + info.project.name + '.png', fullPage: true });
  await page.locator('.location-picker').screenshot({ path: 'test-results/hand-guide-' + info.project.name + '.png' });
  await page.getByRole('button', { name: 'Pain', exact: true }).click();
  await page.getByRole('button', { name: 'Swelling', exact: true }).click();
  await page.getByRole('button', { name: 'Pain 6 out of 10', exact: true }).click();
  await page.getByLabel('Notes', { exact: false }).fill('Test observation');
  await page.getByLabel('Started at').fill('2026-07-01T13:30');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText('Entry saved. One more observation in your logbook.')).toBeVisible();
  await page.getByRole('button', { name: 'Add another', exact: true }).click();
  await page.getByRole('button', { name: /Use details from.*Hands & wrists/ }).click();
  await expect(page.getByRole('button', { name: 'Pain', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByRole('button', { name: 'Pain 6 out of 10' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await page.getByRole('button', { name: 'Clear & close' }).click();
  expect(await page.evaluate(() => localStorage.getItem('psa-logbook-entry-draft-v1'))).toBeNull();
  await page.getByLabel('Time period').selectOption('0');
  await nav(page, 'History');
  await expect(page.getByText('Test observation')).toBeVisible();
  await expect(page.getByText('Index finger · middle joint', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit entry' }).click();
  await expect(page.getByLabel('Started at')).toHaveValue('2026-07-01T13:30');
  await page.getByRole('button', { name: 'Cancel edit' }).click();
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Time period').selectOption('0');
  await nav(page, 'History');
  await expect(page.getByText('Test observation')).toBeVisible();
});
test('requires explicit symptoms and pain, preserves draft across navigation', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Knees', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Select at least one symptom.');
  await page.getByRole('button', { name: 'Stiffness', exact: true }).click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose your pain level');
  await page.getByLabel('Notes', { exact: false }).fill('Draft stays here');
  await page.reload();
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByLabel('Notes', { exact: false })).toHaveValue('Draft stays here');
  await nav(page, 'Overview');
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByLabel('Notes', { exact: false })).toHaveValue('Draft stays here');
  await page.getByRole('button', { name: 'Pain 0 out of 10', exact: true }).click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText('Entry saved. One more observation in your logbook.')).toBeVisible();
});

test('front and back guides load and place Back on the rear view', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Log symptoms', exact: true }).filter({ visible: true }).first().click();
  const guide = page.locator('.body-guide');
  await expect(guide.locator('img')).toHaveAttribute('src', /body-front\.png$/);
  await expect(guide.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back view' }).click();
  await expect(guide.locator('img')).toHaveAttribute('src', /body-back\.png$/);
  await expect(guide.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  expect(await guide.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.locator('.location-picker').screenshot({ path: 'test-results/body-back-' + info.project.name + '.png' });
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Back · Area only / unsure joint')).toBeVisible();
  await page.getByRole('button', { name: 'Change area' }).click();
  await expect(page.getByRole('button', { name: 'Back view' })).toHaveAttribute('aria-pressed', 'true');
});

test('saves several areas in one session with a separate pain score', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Knees', exact: true }).first().click();
  await page.getByRole('button', { name: 'Stiffness', exact: true }).click();
  await page.getByRole('button', { name: 'Pain 4 out of 10' }).click();
  await page.getByRole('button', { name: /Fatigue, morning stiffness/ }).click();
  await page.getByLabel('Fatigue (0–10)').fill('6');
  await page.getByLabel('Morning stiffness (minutes)').fill('35');
  const sessionStart = await page.getByLabel('Started at').inputValue();
  await page.getByRole('button', { name: 'Save and add another area' }).click();
  await expect(
    page.getByText('1 area saved. Choose the next location and its own pain score.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stiffness', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByRole('button', { name: 'Pain 4 out of 10' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await expect(page.getByLabel('Started at')).toHaveValue(sessionStart);
  await page.getByRole('button', { name: 'Feet & ankles', exact: true }).first().click();
  await page.getByRole('button', { name: 'Pain 7 out of 10' }).click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await nav(page, 'History');
  await expect(page.getByRole('article')).toHaveCount(2);
  const kneesEntry = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /^Knees/ }) });
  const feetEntry = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /^Feet & ankles/ }) });
  await expect(kneesEntry.locator('.pain-badge')).toHaveText('4/10');
  await expect(feetEntry.locator('.pain-badge')).toHaveText('7/10');
  await kneesEntry.getByText('Entry details').click();
  await expect(kneesEntry.getByText('35 min')).toBeVisible();
  await feetEntry.getByText('Entry details').click();
  await expect(feetEntry.locator('dd').filter({ hasText: 'Not recorded' })).toHaveCount(5);
  await nav(page, 'Stats');
  await expect(page.locator('.measure-card').filter({ hasText: 'Fatigue' })).toContainText('6.0 / 10');
  await expect(page.locator('.measure-card').filter({ hasText: 'Morning stiffness' })).toContainText(
    '35 min'
  );
});
test('overview, filters, Excel download, and JSON restore', async ({ page }, info) => {
  await seed(page);
  await page.reload(); // Native IndexedDB fixture writes do not emit Dexie mutation notifications.
  await expect(page.locator('.filter-count')).toHaveText('18 entries');
  await page.getByLabel('Time period').selectOption('-1');
  await expect(page.getByRole('group', { name: 'Custom date range' })).toBeVisible();
  await page
    .getByRole('group', { name: 'Custom date range' })
    .getByLabel('From', { exact: true })
    .fill('2026-01-01');
  await page
    .getByRole('group', { name: 'Custom date range' })
    .getByLabel('To', { exact: true })
    .fill('2026-01-31');
  await expect(page.locator('.filter-count')).toHaveText('0 entries');
  await page.getByLabel('Time period').selectOption('30');
  await nav(page, 'Stats');
  await expect(page.getByRole('heading', { name: 'Compare two periods' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your pain history' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pain-score spread' })).toBeVisible();
  await page.screenshot({ path: 'test-results/stats-' + info.project.name + '.png', fullPage: true });
  await nav(page, 'Overview');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/overview-' + info.project.name + '.png', fullPage: true });
  await page.getByText('Filters', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Body area', exact: true }).selectOption('hands');
  await expect(page.locator('.filter-count')).toHaveText('6 entries');
  await page.getByText('Filters', { exact: true }).click();
  await nav(page, info.project.name === 'phone' ? 'Export' : 'Export & backup');
  await expect(page.getByText('6 entries selected', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Excel report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('psa-logbook-report.xlsx');
  await download.saveAs('test-results/report-' + info.project.name + '.xlsx');
  const backup = {
    schemaVersion: 1,
    events: [
      {
        id: 'imported',
        startAt: Date.now() - 1000,
        pain: 2,
        region: 'Neck',
        regionKey: 'neck',
        symptomKey: 'stiffness',
        notes: 'Restored observation',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  };
  await page.getByLabel('Restore a JSON backup').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await page.getByRole('button', { name: 'Import backup', exact: true }).click();
  await expect(page.getByText('Imported or updated 1 entries.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await nav(page, 'History');
  await expect(page.getByText('Restored observation')).toBeVisible();
  await page
    .getByRole('article')
    .filter({ hasText: 'Restored observation' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('button', { name: 'Keep entry', exact: true }).click();
  await expect(page.getByText('Restored observation')).toBeVisible();
});
test('foot closeup has accessible choices and fits the screen', async ({ page }, info) => {
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Feet & ankles', exact: true }).first().click();
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  const rightBigToe = await page.getByRole('button', { name: 'Big toe', exact: true }).first().boundingBox();
  const rightLittleToe = await page
    .getByRole('button', { name: 'Little toe', exact: true })
    .first()
    .boundingBox();
  expect(rightBigToe!.x).toBeLessThan(rightLittleToe!.x);
  const rightToeMarkers = await page.locator('.foot-guide .digit-point').all();
  for (let i = 0; i < rightToeMarkers.length - 1; i++) {
    const first = await rightToeMarkers[i].boundingBox();
    const next = await rightToeMarkers[i + 1].boundingBox();
    expect(first!.x + first!.width).toBeLessThanOrEqual(next!.x + 1);
  }
  await page.getByRole('button', { name: 'Left', exact: true }).click();
  const leftBigToe = await page.getByRole('button', { name: 'Big toe', exact: true }).first().boundingBox();
  const leftLittleToe = await page
    .getByRole('button', { name: 'Little toe', exact: true })
    .first()
    .boundingBox();
  expect(leftBigToe!.x).toBeGreaterThan(leftLittleToe!.x);
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  await page.getByRole('button', { name: 'Big toe', exact: true }).click();
  await expect(page.locator('.digit-artwork img')).toHaveAttribute('src', /toe\.png$/);
  await page.getByRole('button', { name: 'Base knuckle', exact: true }).click();
  await expect(
    page.getByText('Right · Feet & ankles · Big toe · base knuckle', { exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/log-' + info.project.name + '.png', fullPage: true });
  await page.getByLabel('Or choose a location by name').selectOption('toe-2-tip');
  await expect(page.locator('.digit-artwork img')).toHaveAttribute('src', /toe-small\.png$/);
  await expect(page.getByRole('button', { name: 'Third toe', exact: true }).first()).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
