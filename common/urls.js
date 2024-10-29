export const baseUrl = 'https://www.builtinnyc.com';

export function getFilepathEnd(url) {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/');
    return pathSegments[pathSegments.length - 1];
}

export function getJobReqId(companyId, url) {
    const fullUrl = `${baseUrl}${url}`;
    const jobId = getFilepathEnd(fullUrl);
    return `${companyId}-${jobId}`;
}