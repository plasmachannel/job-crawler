LAMBDA_ARN="arn:aws:lambda:us-east-2:015584085679:function:job-profile-uploader"

# Step 4: Run the Lambda function
echo "Invoking Lambda function..."
aws lambda invoke --function-name $LAMBDA_ARN response.json
if [ $? -ne 0 ]; then
    echo "Failed to invoke Lambda function. Exiting."
    exit 1
fi
echo "Lambda function invoked successfully. Check 'response.json' for the output."

