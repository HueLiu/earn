import {} from "dotenv/config";
import { chromium } from "playwright";
import { scheduleScreenshot } from "./lib/lib.js";

(async () => {
  const userDataDir = "./data/browser/ebesucher";
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
  console.log("[ebesucher]", "chromium launched successfully.");

  const username = process.env.EBESUCHER_USERNAME;

  // open surfbar
  const page = browserContext.pages()[0];
  await page.goto(`https://www.ebesucher.com/surfbar/${username}`);
  await page.click("a#surf_now_button");
  scheduleScreenshot(page, "ebesucher", "surfbar");
  console.log("[ebesucher] Open surfbar successfully.");
})();
