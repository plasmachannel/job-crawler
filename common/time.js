import logger from "./logger.js";

export function isMoreThanOneMonthApart(date1, date2) {
    const year1 = date1.getFullYear();
    const year2 = date2.getFullYear();
    const month1 = date1.getMonth();
    const month2 = date2.getMonth();

    // Calculate the difference in months
    const monthDifference = (year2 - year1) * 12 + (month2 - month1);

    return Math.abs(monthDifference) > 1;
}

export function lastUpdatedHasExpired(companySeenInfo) {
    if (companySeenInfo) {
        const {lastUpdated} = companySeenInfo;
        const lastUpdatedDate = new Date(lastUpdated);
        return isMoreThanOneMonthApart(Date.now(), lastUpdatedDate);
    }
    return true;
}