import type { Page } from 'playwright-chromium';

export async function login(page: Page, username: string, password: string): Promise<void> {
  // open login page
  await page.goto('/login/');
  await page.waitForTimeout(2000);

  // agree to cookie policy
  // await page.locator('#onetrust-accept-btn-handler').click();
  // await page.waitForTimeout(1000);

  // login and wait for the home page to load
  await page.getByTestId('email').fill(username);
  await page.waitForTimeout(1000);
  await page.getByTestId('current-password').fill(password);
  await page.waitForTimeout(1000);

  // check for recaptcha
  try {
    const recaptcha = page.frameLocator('[title="reCAPTCHA"]');
    const checkbox = recaptcha.locator('#recaptcha-anchor');
    await checkbox.waitFor({ timeout: 3000 });
    await checkbox.click({ force: true });
    await recaptcha.locator('.recaptcha-checkbox-checkmark').waitFor({ timeout: 3000 });

    console.info('Recaptcha found, aborting');
    throw new Error('Recaptcha found');
  } catch (error) {}

  // submit the login form and wait for redirect
  await page.getByTestId('submit').click();
  await page.waitForURL('**/home/**');
}
