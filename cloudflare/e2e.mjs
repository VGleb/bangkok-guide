import { chromium } from 'playwright';

const token = process.env.FEEDBACK_API_TOKEN;
if (!token) throw new Error('FEEDBACK_API_TOKEN is required');

const url = 'https://vgleb.github.io/bangkok-guide/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(value => localStorage.setItem('bangkok-feedback-token-v1', value), token);
  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });

  await page.waitForFunction(
    () => document.querySelector('#cloudBrief')?.textContent?.includes('Сохранено'),
    { timeout: 20_000 }
  );

  const cloud = await page.locator('#cloudBrief').innerText();
  assert(cloud.includes('Сохранено'), 'Cloud sync did not reach saved state');

  await page.locator('#search').fill('2nd STREET — Siam Discovery');
  await page.waitForTimeout(300);
  const cards = page.locator('#results .card');
  assert(await cards.count() === 1, 'Expected exactly one Siam Discovery card');
  const card = cards.first();
  assert((await card.innerText()).includes('2nd STREET'), 'Siam Discovery card is missing');
  assert(await card.evaluate(el => el.classList.contains('visited')), 'Siam Discovery is not rendered as visited');
  assert(await card.locator('.tag.new').count() === 0, 'Visited Siam Discovery is still rendered as new');

  await page.locator('#search').fill('');
  await page.waitForTimeout(200);
  assert(await page.locator('#results .card').count() > 0, 'Catalog is empty before view switching');

  for (let i = 0; i < 3; i++) {
    await page.locator('#viewMap').click();
    await page.waitForTimeout(300);
    assert(await page.locator('#mapView').evaluate(el => !el.hidden), 'Map view did not open');
    assert(await page.locator('#listView').evaluate(el => el.hidden), 'List view stayed visible while map opened');

    await page.locator('#viewList').click();
    await page.waitForTimeout(150);
    assert(await page.locator('#listView').evaluate(el => !el.hidden), 'Catalog did not reopen');
    assert(await page.locator('#mapView').evaluate(el => el.hidden), 'Map view stayed visible after returning to catalog');
    assert(await page.locator('#results .card').count() > 0, 'Catalog cards disappeared after map round-trip');
  }

  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForFunction(
    () => document.querySelector('#cloudBrief')?.textContent?.includes('Сохранено'),
    { timeout: 20_000 }
  );
  assert(pageErrors.length === 0, 'Page errors: ' + pageErrors.join(' | '));

  console.log('Browser E2E passed');
} finally {
  await browser.close();
}
