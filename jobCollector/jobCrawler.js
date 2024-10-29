import {sendAllToJobQueue} from "../common/queue.js";
import {clickToNextPage} from "../common/pagination.js";
import logger from "../common/logger.js";
import {getFilepathEnd} from "../common/urls.js";
import {hashesMatch, hashPageByUrl, hashWebPage} from "../common/hash.js";
import {getCompanySeen, markCompanyAsSeen} from "../common/s3.js";
import {isMoreThanOneMonthApart, lastUpdatedHasExpired} from "../common/time.js";


const baseUrl = 'https://www.builtinnyc.com';

async function getJobLinksOnCurrentPage(page) {
    return await page.evaluate(() => {
        const links = [];
        // Extract job links from top results
        document.querySelectorAll('#search-results-top a.card-alias-after-overlay').forEach(element => {
            const href = element.getAttribute('href');
            if (href) links.push(href);
        });
        // Extract job links from bottom results
        document.querySelectorAll('#search-results-bottom a.card-alias-after-overlay').forEach(element => {
            const href = element.getAttribute('href');
            if (href) links.push(href);
        });
        return links;
    });
}

async function getAllJobsUrl(page) {
    return await page.evaluate(() => {
        const elements = [...document.querySelectorAll('a')]; // Select all <a> elements
        const element = elements.find(el => el.innerHTML.includes('View all jobs')); // Find the one with matching text
        return element ? element.getAttribute('href') : null; // Return the href attribute
    });
}

async function doesNotHaveJobs(page) {
    return await page.evaluate(() => {
        const x = Array.from(document.querySelectorAll('.text-midnight-light.fs-sm.fw-semibold.nav-link'));
        const jobsTab = x.filter(e => e.innerText.includes('Jobs'));
        if (jobsTab.length > 0) {
            const jobTextTokens = jobsTab[0].innerText.split(' ');
            return jobTextTokens.length < 2;
        }
        return false;
    });
}

async function goToViewAllJobsPage(page) {
    const viewAllJobsUrl = await getAllJobsUrl(page);
    logger.info({viewAllJobsUrl});
    if (!viewAllJobsUrl) {
        return false;
    }
    const allJobsUrl = `${baseUrl}${viewAllJobsUrl}`;
    await page.goto(allJobsUrl, {waitUntil: 'networkidle0'});
    return true;
}

export default async function jobCrawler(page, url, sendInQueue = true)  {
    const companySeenInfo = await getCompanySeen(url);
    const companyId = getFilepathEnd(url);
    if (!lastUpdatedHasExpired(companySeenInfo)) {
        logger.info('This job has been checked in the last month, skipping ', url);
        return true;
    }
    await page.goto(url, {waitUntil: 'networkidle0'});

    const hash = await hashWebPage(page);

    if (hashesMatch(hash, companySeenInfo, page)) {
        logger.info(`Hashes match for ${url}`);
        return true;
    }
    const areNoJobs = await doesNotHaveJobs(page);
    if (areNoJobs) {
        logger.info(`${url} does not have job listings at this time`)
        await markCompanyAsSeen(companyId, hash);
        return true;
    }
    try {
        const didVisitPage = await goToViewAllJobsPage(page);
        if (!didVisitPage) {
            logger.warn('couldnt find view all page', url);
            return false;
        }

        let allJobLinks = [];
        let currentPage = 0;
        while (1) {
            currentPage++;
            const jobLinks = await getJobLinksOnCurrentPage(page);
            const jobLinksWithCompany = jobLinks.map(jl => ({
                companyId,
                url: jl
            }));
            logger.verbose('found some job links:', jobLinks);
            allJobLinks = allJobLinks.concat(jobLinksWithCompany);
            try {
                // Check if the "Next Page" button exists
                const didGoToNextPage = await clickToNextPage(page);
                if (!didGoToNextPage) {
                    break;
                }
            } catch (error) {
                logger.error(error);
                break;
            }
        }
        // Extract job links from the search results

        // Log the found links
        logger.info('Links found:');
        allJobLinks.forEach((link, index) => {
            console.log(`${index + 1}. ${link.companyId}, ${link.url}`);
        });

        if (sendInQueue) {
            await sendAllToJobQueue(allJobLinks);
        }
        await markCompanyAsSeen(companyId, hash);
        return true;
    } catch (err) {
        logger.error(`Something went wrong when trying to access company page ${url}: ${error}`);
        return false;
    }
};
