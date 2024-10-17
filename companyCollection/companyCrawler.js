import {baseUrl} from "../common/urls.js";
import {sendAllToCompanyQueue} from "../common/queue.js";
import {clickToNextPage} from "../common/pagination.js";

const distinctUrls = urls => {
    const urlSet = new Set(urls);
    return [...urlSet];
}

async function getCompanyLinksOnPage(page) {
    const linksOnPage =  await page.evaluate(() => {
        const hrefs = [];
        document.querySelectorAll('#main-container a').forEach((element) => {
            const href = element.getAttribute('href');
            if (href && href.startsWith('/company')) {
                hrefs.push(href);
            }
        });
        return hrefs;
    });

    return distinctUrls(linksOnPage);
}


const companyUrl = `${baseUrl}/companies/`;
export default async function companyCrawler (page, sendInQueue = true) {
    // Navigate to the target website
    await page.goto(companyUrl, {waitUntil: 'networkidle2'});

    let allLinks = [];

    // Extract only fully formed URLs on the page
    let currentPage = 0;
    const pageLimit = 2;
    while (1 && currentPage < pageLimit) {
        currentPage++;
        const companyLinks = await getCompanyLinksOnPage(page);

        const urlsToVisit = companyLinks.map((link, index) =>  `${baseUrl}${link}`);
        allLinks = allLinks.concat(urlsToVisit);

        try {
            const didGoToNextPage = await clickToNextPage(page);
            if (!didGoToNextPage) {
                break;
            }
        } catch (error) {
            console.error(error);
            break;
        }
    }

    if (sendInQueue) {
        await sendAllToCompanyQueue(allLinks);
    }
    console.log(allLinks);

}

