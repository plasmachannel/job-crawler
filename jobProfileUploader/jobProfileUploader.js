// import searchClient from "../common/searchClient.js";
import logger from "../common/logger.js";

import {generateEmbedding} from "../common/embeddings.js";
import {getFilepathEnd} from "../common/urls.js";
import {markJobReqAsSeen} from "../common/s3.js";
import dotenv from "dotenv";

const baseUrl = 'https://www.builtinnyc.com';

dotenv.config();
// const client = searchClient;

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

        return {
            salaryText: divWithSalary[0] ? divWithSalary[0].innerText.trim() : 'no salary text found',
            officeType: divWithOfficeType[0] ? divWithOfficeType[0].innerText.trim(): 'no office type specified',
            yearsOfExperience: divWithYoe[0] ? divWithYoe[0].innerText.trim(): 'no yoe listed',
            companyName: companyName,
            roleName: roleTitle,
            location: divWithLocationDot[0] ? divWithLocationDot[0].innerText.trim() : 'no location name',
        };
    });
}

async function getJobDescriptionText(page) {
    return await page.evaluate(() => {
        const roleDescriptionSelector = '.bg-white.rounded-3.p-md.mb-sm.overflow-hidden.position-relative.small-size';
        const jobDescriptionDiv = document.querySelector(roleDescriptionSelector);
        if (jobDescriptionDiv) {
            const nodes = Array.from(jobDescriptionDiv.querySelectorAll('p, ul, li'));
            return Array.prototype.reduce.call(nodes, function(html, node) {
                return html + ( node.outerHTML || node.nodeValue );
            }, "");
        }
        return '';
    });
}

async function jobUploader(page, url, companyId) {
    const fullUrl = `${baseUrl}${url}`;
    logger.debug(`navigating to ${fullUrl}`);
    await page.goto(`${fullUrl}`, { waitUntil: 'networkidle2' });

    try {
        const metadataFields = await getMetadataFields(page);
        logger.verbose({metadataFields});

        const jobDescriptionText = await getJobDescriptionText(page);
        const embeddedText = await generateEmbedding(jobDescriptionText);
        const {salaryText, companyName, roleName, location, officeType, yearsOfExperience} = metadataFields;
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

        const jobId = getFilepathEnd(fullUrl);
        let jobReqId = `${companyId}-${jobId}`;
        const jobReqBody = {
            companyName,
            roleName,
            location,
            officeType,
            yearsOfExperience,
            minSalary: salaryRange[0],
            maxSalary: salaryRange[1],
            jobDescription: jobDescriptionText,
            descriptionEmbedding: embeddedText,
            createdAt: Date.now(),
            url: fullUrl,
        }
        await markJobReqAsSeen(jobReqId, jobReqBody);

        /*
        const response = await client.index({
            index: "jd-index",
            id: jobReqId,
            body: jobReqBody,
        });
        logger.verbose({response});

         */
        logger.info(`Job ID created ${companyName}-${jobId}`);
        return true;
    } catch (error) {
        logger.error(`Something went wrong when trying to access job listing metadata at ${fullUrl}: ${error}`);
        return false;
    }
}

export default jobUploader;
