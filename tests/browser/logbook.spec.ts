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
test('diagram logging, multiple symptoms, edit cancellation, and reload persistence', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Hands & wrists', exact: true }).first().click();
  await page.getByRole('button', { name: 'Left', exact: true }).click();
  await page.getByRole('button', { name: 'Index finger', exact: true }).click();
  await page.getByRole('button', { name: 'Middle joint', exact: true }).click();
  await page.getByRole('button', { name: 'Pain', exact: true }).click();
  await page.getByRole('button', { name: 'Swelling', exact: true }).click();
  await page.getByRole('button', { name: 'Pain 6 out of 10', exact: true }).click();
  await page.getByLabel('Notes', { exact: false }).fill('Test observation');
  await page.getByLabel('Started at').fill('2026-07-01T13:30');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText('Entry saved. One more observation in your logbook.')).toBeVisible();
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
test('overview, filters, Excel download, and JSON restore', async ({ page }, info) => {
  await seed(page);
  await page.reload(); // Native IndexedDB fixture writes do not emit Dexie mutation notifications.
  await expect(page.locator('.filter-count')).toHaveText('18 entries');
  await expect(page.getByRole('heading', { name: 'Your pain history' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Big toe', exact: true }).click();
  await page.getByRole('button', { name: 'Base knuckle', exact: true }).click();
  await expect(
    page.getByText('Right · Feet & ankles · Big toe · base knuckle', { exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/log-' + info.project.name + '.png', fullPage: true });
});
