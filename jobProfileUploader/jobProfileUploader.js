import searchClient from "../common/searchClient.js";
import logger from "../common/logger.js";

const baseUrl = 'https://www.builtinnyc.com';

const client = searchClient;

function getSalaryLimit(salaryText) {
    return salaryText.trim().split('-');
}

async function getMetadataFields(page) {
    return await page.evaluate(() => {
        const locationClass = 'i.fa-location-dot';
        const officeTypeClass = 'i.fa-house-building';
        const salaryClass = 'i.fa-sack-dollar';
        const yearsExperienceClass = 'i.fa-trophy';

        const divs = Array.from(document.querySelectorAll('.d-flex.align-items-start.gap-sm'));
        const divWithLocationDot = divs.filter(div => div.querySelector(locationClass));
        const divWithSalary = divs.filter(div => div.querySelector(salaryClass));
        const divWithOfficeType = divs.filter(div => div.querySelector(officeTypeClass));
        const divWithYoe = divs.filter(div => div.querySelector(yearsExperienceClass));

        const roleTitle = document.querySelector('h1.fw-extrabold.fs-xl.mb-sm').innerText;
        const companyName = document.querySelector('h2.text-pretty-blue.m-0').innerText;

        // TODO - in the case where theres no data, we should probably mark this link as dead
        // I assume the websites are static and never change so we never need to re-run this
        // job for the same link twice
        // that means we can have our top evel crawler run every so often and scour for new links
        return {
            salaryText: divWithSalary[0] ? divWithSalary[0].innerText.trim() : 'no salary text found',
            officeType: divWithOfficeType[0] ? divWithOfficeType[0].innerText.trim(): 'no office type specified',
            yearsOfExperience: divWithYoe[0] ? divWithYoe[0].innerText.trim(): 'no yoe listed',
            companyName: companyName || 'no company name',
            roleName: roleTitle || 'no role name',
            location: divWithLocationDot[0] ? divWithLocationDot[0].innerText.trim() : 'no location name',
        };
    });
}

function getJobId(url) {
    console.log({url});
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/');
    return pathSegments[pathSegments.length - 1];
}

async function jobUploader(page, url) {
    const fullUrl = `${baseUrl}${url}`;
    logger.debug(`navigating to ${fullUrl}`);
    await page.goto(`${fullUrl}`, { waitUntil: 'networkidle2' });
    const metadataFields = await getMetadataFields(page);
    logger.verbose({metadataFields});

    const jobDescriptionText = await page.evaluate(() => {
        const jobDescriptionDiv = document.querySelector('.container.py-lg');
        if (jobDescriptionDiv) {
            return Array.from(jobDescriptionDiv.querySelectorAll('p, ul, li'))
                .map(element => element.innerText.trim())
                .join(' ');
        }
        return '';
    });

    const { salaryText, companyName, roleName, location, officeType, yearsOfExperience } = metadataFields;

    const salaryRange = getSalaryLimit(salaryText);

    logger.verbose({
        companyName,
        roleName,
        location,
        officeType,
        yearsOfExperience,
        minSalary: salaryRange[0],
        maxSalary: salaryRange[1],
        jobDescription: jobDescriptionText,
    });

    const jobId = getJobId(fullUrl);
    const response = await client.index({
        index: "jd-index",
        id: `${companyName}-${jobId}`,
        body: {
            companyName,
            roleName,
            location,
            officeType,
            yearsOfExperience,
            minSalary: salaryRange[0],
            maxSalary: salaryRange[1],
            jobDescription: jobDescriptionText,
            createdAt: Date.now(),
        },
    });

    logger.verbose({response});
    logger.log(`Job ID created ${companyName}-${jobId}`);

    return 'job finished';
}

export default jobUploader;
