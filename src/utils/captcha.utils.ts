import type { Page } from 'playwright-chromium';
import { pickNumber } from './randomize.utils.js';

// https://github.com/xrip/playwright-recaptcha-solver
export async function solveCaptcha(page: Page) {
  const anchorIframe = page.frameLocator('iframe[src*="api2/anchor"]');
  const reCaptchaIframe = page.frameLocator('iframe[src*="api2/bframe"]');

  await anchorIframe.locator('#recaptcha-anchor').click({ delay: pickNumber(30, 150) });
  await reCaptchaIframe.locator('#recaptcha-audio-button').click({ delay: pickNumber(30, 150) });

  const audioLink = reCaptchaIframe.locator('#audio-source');

  while (true) {
    const audioCaptcha = await page.waitForResponse(await audioLink.getAttribute('src'));
    try {
      const response = await fetch('https://api.wit.ai/speech?v=2021092', {
        method: 'POST',
        headers: { Authorization: 'Bearer JVHWCNWJLWLGN6MFALYLHAPKUFHMNTAC', 'Content-Type': 'audio/mpeg3' },
        body: await audioCaptcha.body(),
      });
      const data = await response.text();
      const audioTranscript = data.match('"text": "(.*)",')[1].trim();

      await reCaptchaIframe.locator('#audio-response').type(audioTranscript, { delay: pickNumber(30, 75) });
      await reCaptchaIframe.locator('#recaptcha-verify-button').click({ delay: pickNumber(30, 150) });
      await anchorIframe.locator('#recaptcha-anchor[aria-checked="true"]').waitFor();

      return page.evaluate(() => document.getElementById('g-recaptcha-response')['value']);
    } catch (e) {
      console.error(e);
      await reCaptchaIframe.locator('#recaptcha-reload-button').click({ delay: pickNumber(30, 150) });
    }
  }
}
