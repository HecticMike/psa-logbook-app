import { expect, test } from '@playwright/test';
test('installed production app reloads, logs, and exports Excel while offline', async ({ page, context }) => {
  await page.route('https://accounts.google.com/**', (route) => route.abort());
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your overview', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Log symptoms', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Neck', exact: true }).first().click();
  await page.getByRole('button', { name: 'Stiffness', exact: true }).click();
  await page.getByRole('button', { name: 'Pain 0 out of 10', exact: true }).click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText('Entry saved. One more observation in your logbook.')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('button', { name: 'Export', exact: true })
    .click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Excel report' }).click();
  expect((await pending).suggestedFilename()).toBe('psa-logbook-report.xlsx');
});
