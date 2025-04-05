import type { Page } from 'playwright-chromium';
import { pickNumber } from './utils/randomize.utils.js';
import { solveCaptcha } from './utils/captcha.utils.js';

export async function login(page: Page, username: string, password: string): Promise<void> {
  // open login page
  await page.goto('/login/');

  // agree to cookie policy
  // await page.locator('#onetrust-accept-btn-handler').click();
  // await page.waitForTimeout(1000);

  // login and wait for the home page to load
  await page.waitForTimeout(pickNumber(1000, 2000));
  await page.getByTestId('email').fill(username);
  await page.waitForTimeout(pickNumber(500, 1500));
  await page.getByTestId('current-password').fill(password);
  await page.waitForTimeout(pickNumber(1000, 2000));

  // check for recaptcha
  try {
    const recaptcha = page.frameLocator('[title="reCAPTCHA"]');
    const checkbox = recaptcha.locator('#recaptcha-anchor');
    await checkbox.waitFor({ timeout: 3000 });
    await checkbox.click({ force: true });
    await recaptcha.locator('.recaptcha-checkbox-checkmark').waitFor({ timeout: 3000 });

    console.info('Recaptcha found, trying to solve it...');
    await solveCaptcha(page);
  } catch (error) {}

  // submit the login form and wait for redirect
  await page.getByTestId('submit').click();
  await page.waitForURL('**/home/**');
}
