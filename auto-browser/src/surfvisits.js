import {} from "dotenv/config";
import { chromium } from "playwright";
import schedule from "node-schedule";
import { scheduleScreenshot, sleep } from "./lib/lib.js";

(async () => {
  const userDataDir = "./data/browser/surfvisits";
  const browserConfig = {
    headless: process.env.HEADLESS === "true",
    ignoreDefaultArgs: ["--enable-automation"],
    acceptDownloads: true
  };
  const browserContext = await chromium.launchPersistentContext(
    userDataDir,
    browserConfig
  );
  browserContext.setDefaultTimeout(0);
  console.log("[surfvisits]", "chromium launched successfully.");

  const username = process.env.SURFVISITS_USERNAME;
  const password = process.env.SURFVISITS_PASSWORD;

  // login
  const page = browserContext.pages()[0];
  await page.goto("https://surfvisits.com/dashboard", {
    waitUtil: "domcontentloaded"
  });
  await sleep(5);
  const needLogin = (await page.locator("input#username-login").count()) > 0;
  if (needLogin) {
    await page.locator("input#username-login").fill(username);
    await sleep(5);
    await page.locator("input#password-login").fill(password);
    await sleep(5);
    await page
      .frameLocator("iframe[title=reCAPTCHA]")
      .locator("div.recaptcha-checkbox-border")
      .click();
    await sleep(10);
    await page.locator("button[type=submit]").click();
  }

  // open surfbar
  await page.locator("a.nav-link.notification-sidebar-toggle").click();
  await sleep(5);
  await page.locator("button.btn.mt-3.btn-sm.btn-success").click();
  console.log("[surfvisits] Open surfbar successfully.");
})();
