

/***
 returns true if able to go to next page
 ***/
export async function clickToNextPage(page) {
    const nextPageButton = await page.$('[aria-label="Go to Next Page"]');

    if (nextPageButton) {
        // Try to click the button if it exists
        await page.click('[aria-label="Go to Next Page"]');
        await page.waitForSelector('[aria-label="Go to Next Page"]', {timeout: 1000});
    } else {
        console.log(`next page button not found on page ${await page.url()}`);
        return false;
    }
    return true;
}