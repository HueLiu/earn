import {} from "dotenv/config";
import { chromium } from "playwright";
import schedule from "node-schedule";
import { scheduleScreenshot, sleep } from "./lib/lib.js";

(async () => {
  const userDataDir = "./data/browser/adnade";
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
  console.log("[adande]", "chromium launched successfully.");

  const username = process.env.ADNADE_USERNAME;
  const password = process.env.ADNADE_PASSWORD;

  // open ptp
  const page1 = browserContext.pages()[0];
  await page1.goto(`https://adnade.net/ptp/?user=${username}`);
  scheduleScreenshot(page1, "adnade", "ptp");
  console.log("[adnade] Open ptp successfully.");

  // open surfbar
  const page2 = await browserContext.newPage();
  await page2.goto(`https://adnade.net/view.php?user=${username}&multi=4`);
  scheduleScreenshot(page2, "adnade", "surfbar");
  console.log("[adnade] Open surfbar successfully.");

  // 定时执行click任务
  const autoClick = async () => {
    const oldPages = browserContext.pages();
    const page = await browserContext.newPage();
    await page.goto("https://adnade.net/login.php");
    const needLogin = (await page.locator("div.beex_form").count()) > 0;
    if (needLogin) {
      await page.locator("div.beex_form input#UserID").fill(username);
      await page.locator("div.beex_form input#Passwort").fill(password);
      await page.locator("div.beex_form input#AutoLogin").click();
      await sleep(3);
      await page.locator("div#tab1 div.beex_form input[type=submit]").click();
      await sleep(3);
    }

    // click banner
    await page.goto(
      "https://adnade.net/login.php?page=klick4credits&navaction=banner"
    );
    while (true) {
      const banners = await page
        .locator("td.wcp table:nth-child(3) td.bgcm table a")
        .all();
      if (banners.length > 0) {
        await banners[0].click();
        await sleep(15);
      } else {
        break;
      }
    }
    console.log("[adande]", "banners clicked successfully.");

    // click textLink
    await page.goto(
      "https://adnade.net/login.php?page=klick4credits&navaction=textlinks"
    );
    while (true) {
      const textLinks = await page
        .locator("td.wcp table:nth-child(3) td.bgcm table a")
        .all();
      if (textLinks.length > 0) {
        await textLinks[0].click();
        await sleep(15);
      } else {
        break;
      }
    }
    console.log("[adande]", "textlinks clicked successfully.");

    await sleep(60);
    const newPages = browserContext.pages();
    for (const p of newPages) {
      if (!oldPages.includes(p)) {
        p.close();
      }
    }
  };

  if (process.env.ENABLE_CLICK === "true") {
    schedule.scheduleJob("0 */15 * * * *", autoClick);
  }
})();
