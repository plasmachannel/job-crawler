#!/bin/bash

rm company-uploader.zip
npm install --omit=dev
npm prune --omit=dev

# Step 1: Zip the files in the directory
echo "Zipping files..."
zip -r company-uploader.zip handler.js companyCollection/ common/ package.json node_modules/
if [ $? -ne 0 ]; then
    echo "Failed to zip files. Exiting."
    exit 1
fi
echo "Files zipped successfully."

# Step 2: Upload the ZIP file to the specified S3 location
S3_BUCKET="s3://job-search-lambda-functions/company-uploader.zip"
echo "Uploading to S3 bucket: $S3_BUCKET"
aws s3 cp company-uploader.zip $S3_BUCKET
if [ $? -ne 0 ]; then
    echo "Failed to upload to S3. Exiting."
    exit 1
fi
echo "Upload to S3 successful."

# Step 3: Update the Lambda function with the new ZIP file
LAMBDA_ARN="arn:aws:lambda:us-east-2:015584085679:function:company-collector"
echo "Updating Lambda function: $LAMBDA_ARN"
aws lambda update-function-code --function-name $LAMBDA_ARN --s3-bucket "job-search-lambda-functions" --s3-key "company-uploader.zip"
if [ $? -ne 0 ]; then
    echo "Failed to update Lambda function. Exiting."
    exit 1
fi
echo "Lambda function updated successfully."

