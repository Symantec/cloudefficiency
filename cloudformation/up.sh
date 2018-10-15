#!/bin/bash
aws cloudformation create-stack \
--stack-name $APP_PREFIX-buckets \
--template-body file://buckets.yaml \
--parameters \
  ParameterKey=StaticBucketName,ParameterValue=$APP_PREFIX-bucket-static \
  ParameterKey=LambdaCodeBucketName,ParameterValue=$APP_PREFIX-bucket-lambda-code \
  ParameterKey=CloudfrontLoggingBucketName,ParameterValue=$APP_PREFIX-bucket-cloudfront-logging

aws cloudformation wait stack-create-complete \
--stack-name $APP_PREFIX-buckets || exit

aws cloudformation create-stack \
--stack-name $APP_PREFIX-iam \
--template-body file://iam.yaml \
--capabilities \
  CAPABILITY_IAM \
  CAPABILITY_NAMED_IAM \
--parameters \
  ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets

aws cloudformation wait stack-create-complete \
--stack-name $APP_PREFIX-iam || exit

pushd ../server
./upload.sh || exit
popd

aws cloudformation create-stack \
--stack-name $APP_PREFIX-lambda \
--template-body file://lambda.yaml \
--parameters \
  ParameterKey=IAMStackName,ParameterValue=$APP_PREFIX-iam \
  ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets \
  ParameterKey=NetworkStackName,ParameterValue=$APP_PREFIX-network

aws cloudformation wait stack-create-complete \
--stack-name $APP_PREFIX-lambda || exit

aws cloudformation create-stack \
--stack-name $APP_PREFIX-api \
--template-body file://api.yaml \
--parameters \
  ParameterKey=IAMStackName,ParameterValue=$APP_PREFIX-iam \
  ParameterKey=LambdaStackName,ParameterValue=$APP_PREFIX-lambda \
  ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets

aws cloudformation wait stack-create-complete \
--stack-name $APP_PREFIX-api || exit

aws cloudformation create-stack \
--stack-name $APP_PREFIX-cloudfront \
--template-body file://cloudfront.yaml \
--parameters \
  ParameterKey=ACMCertificateArn,ParameterValue=$CERT_ARN \
  ParameterKey=APIStackName,ParameterValue=$APP_PREFIX-api \
  ParameterKey=CNAME,ParameterValue=$APP_URL \
  ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets
