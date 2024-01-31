import schedule from "node-schedule";

export const sleep = seconds => {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
};

export const scheduleScreenshot = (page, type, name) => {
  const cron = "0 * * * * *";
  return schedule.scheduleJob(cron, () => {
    const imgPath = `data/${type}/${name}.png`;
    page.screenshot({
      path: imgPath,
      fullPage: true
    });
  });
};
