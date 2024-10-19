import {sendAllToJobQueue} from "../common/queue.js";
import {clickToNextPage} from "../common/pagination.js";
import logger from "../common/logger.js";


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
        const element = elements.find(el => el.innerHTML.includes('See all jobs at')); // Find the one with matching text
        return element ? element.getAttribute('href') : null; // Return the href attribute
    });
}

async function doesNotHaveJobs(page) {
    return await page.evaluate(() => {
        var headerElements = Array.from(document.querySelectorAll('h2'))
        const noJobTextElements = headerElements.filter(e => e.innerText.includes('No jobs to discover at this time'));
        return noJobTextElements.length > 0;
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

export default async function jobCrawler(page, jobUrl, sendInQueue = true)  {
    const companyJobPage = `${jobUrl}/jobs`;
    await page.goto(companyJobPage, {waitUntil: 'networkidle0'});

    const areNoJobs = await doesNotHaveJobs(page);
    if (areNoJobs) {
        logger.info(`${jobUrl} does not have job listings at this time`)
        return true;
    }

    try {
        const didVisitPage = await goToViewAllJobsPage(page);
        if (!didVisitPage) {
            logger.warn('couldnt find view all page', jobUrl);
            return false;
        }

        let allJobLinks = [];
        let currentPage = 0;
        while (1) {
            currentPage++;
            const jobLinks = await getJobLinksOnCurrentPage(page);
            logger.verbose('found some job links:', jobLinks);
            allJobLinks = allJobLinks.concat(jobLinks);
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
            console.log(`${index + 1}. ${link}`);
        });

        if (sendInQueue) {
            await sendAllToJobQueue(allJobLinks);
        }
        return true;
    } catch (err) {
        logger.error(`Something went wrong when trying to access company page ${jobUrl}: ${error}`);
        return false;
    }
};
