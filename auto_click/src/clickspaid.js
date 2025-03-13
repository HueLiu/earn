import {} from "dotenv/config";
import { firefox } from "playwright";
import getPort from "get-port";
import { connect } from "../node_modules/web-ext/lib/firefox/remote.js";
import { sleep, writeFile, getCurrentTime } from "./common.js";

const proxySettings = {
  server: process.env.PROXY_SERVER
};
const firefoxUserPrefs = {
  "devtools.chrome.enabled": true,
  "devtools.debugger.prompt-connection": false,
  "devtools.debugger.remote-enabled": true,
  "toolkit.telemetry.reportingpolicy.firstRun": true,
};
const extensionPath = process.env.CLICKSPAID_ADDON_PATH;
const username = process.env.CLICKSPAID_USERNAME;
const password = process.env.CLICKSPAID_PASSWORD;
autoClick();

async function autoClick() {
  // 写入登录信息
  writeFile(`${extensionPath}/settings_1.js`, `var username="${username}";\nvar password="${password}";\n`);

  const rpp_port = await getPort();
  const browser = await firefox.launch({
    headless: false,
    args: [`--start-debugger-server=${rpp_port}`],
    ignoreDefaultArgs: ["--enable-automation"],
    firefoxUserPrefs: firefoxUserPrefs,
    proxy: proxySettings,
  });
  browser.setDefaultTimeout(0);
 
  const rdp = await connect(rpp_port);
  await rdp.installTemporaryAddon(extensionPath);
  rdp.disconnect();
  log("==== playwright.launch done ====");

  let page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.goto('https://www.google.com/ncr');
  await sleep(5);
  await page.goto('https://clickspaid.com');

  log("==== service start successfully ====");
}

function log(...args) {
  console.log("[clickspaid]", getCurrentTime(), ...args);
}
