
import companyCrawler from "./companyCollection/companyCrawler.js";
import getBrowser from "./common/getBrowser.js";

const browser = await getBrowser();
const page = await browser.newPage();
companyCrawler(page, true).then(async() => {
    await browser.close();
});