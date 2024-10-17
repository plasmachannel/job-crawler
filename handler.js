import companyCrawler from "./companyCollection/companyCrawler.js";
import getBrowser from "./common/getBrowser.js";



export const handler = async (event) => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // TODO - update to take in a range
    try {
        await companyCrawler(page);
        return {
            statusCode: 200,
            body: JSON.stringify('Hello from Lambda!'),
        };
    } catch(error) {
        const errMsg = 'an error has happened' + error.message;
        return {
            statusCode: 500,
            body: JSON.stringify(errMsg),
        };
    } finally {
        await browser.close();
    }
};
