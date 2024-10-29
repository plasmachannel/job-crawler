import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin())

export default async function getBrowser() {
    if (process.env.AWS_EXECUTION_ENV) {
        return await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    }

    return puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--no-sandbox'],
    });
}


