// Optional QA dependency: npm install --no-save --package-lock=false --prefix .browser-tools --cache .browser-tools/cache playwright-core
import { chromium } from '../.browser-tools/node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 15000 });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3000');
  assert.equal(await page.locator('#calculate').isDisabled(), true);
  console.log('PASS: Initial page and disabled calculation');
  for (const [kind, query] of [['start', '서울역'], ['end', '서울특별시청']]) {
    await page.locator(`#${kind}`).fill(query);
    await page.locator(`#${kind}-form button`).click();
    await page.locator(`#${kind}-results button`).first().waitFor({ timeout: 30000 });
    await page.locator(`#${kind}-results button`).first().click();
    console.log(`PASS: Live Nominatim search and selection (${query})`);
  }
  assert.equal(await page.locator('#calculate').isEnabled(), true);
  await page.locator('#calculate').click();
  await page.locator('#result').waitFor({ state: 'visible', timeout: 30000 });
  console.log('PASS: Live OSRM driving distance:', await page.locator('#distance').innerText());
  assert.ok((await page.locator('#map-link').getAttribute('href')).includes('engine=fossgis_osrm_car'));
  await mkdir('test-artifacts', { recursive: true });
  await page.screenshot({ path: 'test-artifacts/desktop.png', fullPage: true });
  await page.locator('input[value=straight]').check();
  assert.equal(await page.locator('#result').isVisible(), false);
  await page.locator('#calculate').click();
  await page.locator('#result').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#map-link').getAttribute('href')).includes('bbox='));
  console.log('PASS: Straight distance:', await page.locator('#distance').innerText());
  const original = await page.locator('#start').inputValue();
  await page.locator('#swap').click();
  assert.equal(await page.locator('#end').inputValue(), original);
  assert.equal(await page.locator('#result').isVisible(), false);
  console.log('PASS: Swap and previous result reset');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#calculate').click();
  await page.locator('#result').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: 'test-artifacts/mobile.png', fullPage: true });
  console.log('PASS: Mobile layout without horizontal overflow');
  await page.locator('#start').fill('부산역');
  assert.equal(await page.locator('#calculate').isDisabled(), true);
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('PASS: Input invalidation and no uncaught JavaScript errors');
} finally { await browser.close(); }
