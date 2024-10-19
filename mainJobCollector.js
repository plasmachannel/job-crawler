
import jobCrawler from "./jobCollector/jobCrawler.js";
import getBrowser from "./common/getBrowser.js";


const browser = await getBrowser();
const page = await browser.newPage();
jobCrawler(page, 'https://www.builtinnyc.com/company/mirakl', false).then(async () => {
    await browser.close();
});
