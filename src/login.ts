import type { BrowserContext } from 'playwright-chromium';

export async function login(
  context: BrowserContext,
  username: string,
  password: string
): Promise<void> {
  const page = await context.newPage();
  await page.goto('/login/');

  // login and wait for the home page to load
  await page.getByTestId('email').fill(username);
  await page.getByTestId('current-password').fill(password);
  await page.getByTestId('submit').click();
  await page.waitForURL('**/home/**');

  // clean up
  await page.close();
}
