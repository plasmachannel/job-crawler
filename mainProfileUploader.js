

import jobProfileUploader from "./jobProfileUploader/jobProfileUploader.js";
import getBrowser from "./common/getBrowser.js";
const jbListingUrl = '/job/senior-ux-writer/263810';

const browser = await getBrowser();
const page = await browser.newPage();
jobProfileUploader(page, jbListingUrl).then(async () => {
    await browser.close()
});
