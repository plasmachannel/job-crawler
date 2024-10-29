
import {EC2Client} from "@aws-sdk/client-ec2";
import dotenv from "dotenv";
dotenv.config();
const profileUploaderInfo = {
    iamProfileName: 'JobCollector',
    instancePrefix: 'ProfileUploaderInstance',
    imageName: 'profile-uploader',
};

const jobCollectorInfo = {
    iamProfileName: 'JobCollector',
    instancePrefix: 'JobCollectorInstance',
    imageName: 'job-collector',
};

export const jobInfoByType = {
    'profile-uploader': profileUploaderInfo,
    'job-collector': jobCollectorInfo,
};

export const amiId = 'ami-0d2978379ddda2f68';  // Your AMI ID
export const keyName = 'elastic-search-1-key';  // AWS key pair name
export const pemFilePath = './elastic-search-1-key.pem';  // Local path to the PEM file
export const securityGroupId = 'sg-0251aa679853915ba';  // Security Group ID for launch-wizard-1
export const ec2Client = new EC2Client({ region: process.env.REGION });
