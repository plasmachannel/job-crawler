import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

// S3 client setup
const s3Client = new S3Client({ region: process.env.REGION });

// Define the bucket and key
const bucketName = "job-crawler-metadata";

export async function markJobReqAsSeen(objectKey, jsonData) {
    const fullKeyName = `job-reqs-seen/${objectKey}.json`;
    await uploadJson(fullKeyName, jsonData);
}

export async function getJobReqInfo(objectKey) {
    const fullKeyName = `job-reqs-seen/${objectKey}.json`;
    return await getJsonObject(fullKeyName);
}

export async function markCompanyAsSeen(companyId, hash) {
    const fullKeyName = `companies-seen/${companyId}.json`;
    await uploadJson(fullKeyName, {hash, lastUpdated: Date.now()});
}

export async function getCompanySeen(url) {
    const fullKeyName = `companies-seen/${url}.json`;
    return await getJsonObject(fullKeyName);
}


export async function uploadJson(objectKey, jsonData) {
    const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: JSON.stringify(jsonData),
        ContentType: "application/json", // Set the content type for JSON
    });

    return await s3Client.send(putCommand);
}


async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}

// Function to retrieve and parse JSON data from S3
async function getJsonObject(objectKey) {
    try {
        const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
        });

        const response = await s3Client.send(getCommand);

        const jsonString = await streamToString(response.Body);
        const jsonData = JSON.parse(jsonString);

        logger.verbose("Retrieved JSON data:", jsonData);
        return jsonData;
    } catch (error) {
        if (error.name === "NoSuchKey" || error.name === "NotFound") {
            return null;
        }
        throw error; // re-throw error if it's not about missing object
    }
}
