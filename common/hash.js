import crypto from "crypto";

export async function hashWebPage(page) {
    try {
        const pageContent = await page.content();
        return crypto.createHash('sha256').update(pageContent).digest('hex');
    } catch (error) {
        console.error('Error hashing the webpage:', error);
    }
}

export function hashesMatch(hash, companySeenInfo, page) {
    if (companySeenInfo) {
        const {hash: previousHash, lastUpdated} = companySeenInfo;
        const lastUpdatedDate = new Date(lastUpdated);
        if (previousHash === hash) {
            return true;
        }
    }
    return false;
}

export async function hashPageByUrl(url) {
    // Launch the browser and create a new page
    try {
        const response = await fetch(url);
        const pageContent = await response.text();        // Generate SHA-256 hash of the page content
        const hash = crypto.createHash('sha256').update(pageContent).digest('hex');

        console.log('SHA-256 hash of the page:', hash);

        return hash;
    } catch (error) {
        console.error('Error hashing the webpage:', error);
    }
}
