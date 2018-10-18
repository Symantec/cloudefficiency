#!/bin/bash

OPERATION=$1
ACM_CERT_ARN=$2
BASE_URI=$3
BUCKET_PREFIX=$4

# Environment variable specified whether to deploy dev or prod
# Prod deployment creates a cloudfront distribution.
# Dev deployment creates an api gateway domain.
CLOUDEFFICIENCY_ENV=${CLOUDEFFICIENCY_ENV:-dev}

STATIC_BUCKET_NAME=$BUCKET_PREFIX-bucket-static
LAMBDA_CODE_BUCKET_NAME=$BUCKET_PREFIX-bucket-lambda-code
CLOUDFRONT_LOGGING_BUCKET_NAME=$BUCKET_PREFIX-bucket-cloudfront-logging

BUCKET_STACK_NAME=${BUCKET_STACK_NAME:-'cloudefficiency-buckets'}
IAM_STACK_NAME=${IAM_STACK_NAME:-'cloudefficiency-stack-iams'}
NETWORK_STACK_NAME=${NETWORK_STACK_NAME:-'cloudefficiency-network'}

if [ ! \( "$OPERATION" = "up" -o "$OPERATION" = "deploy" -o "$OPERATION" = "create-buckets" \) ]; then
  cat <<"EOF"
  Mandatory Arguments:
  - create-buckets | up | deploy
  - ACM certificate ARN
  - domain name to serve cloudefficiency dashboard
  - Unique prefix for bucket names

  create-buckets:
    Only creates the cloudefficiency buckets in one cloudformation stack.

  up:
    Depends on buckets already existing and having
    lambda archives uploaded (../server/upload.sh)

    Creates initial resources:
    - iam policies and roles
    - initiial cloudefficiency stack

  deploy:
    Depends on buckets already existing and having
    lambda archives uploaded (../server/upload.sh)

    If files have changed, updates the lambdas and wires them through
    to the api gateway deployment.
EOF
  exit 1
fi

if [ "$OPERATION" = 'create-buckets' ]; then
  echo "Creating cloudformation stack $BUCKET_STACK_NAME for cloudefficiency buckets."
  aws cloudformation create-stack \
  --stack-name $BUCKET_STACK_NAME \
  --template-body file://buckets.yaml \
  --parameters \
  ParameterKey=StaticBucketName,ParameterValue=$STATIC_BUCKET_NAME \
  ParameterKey=LambdaCodeBucketName,ParameterValue=$LAMBDA_CODE_BUCKET_NAME \
  ParameterKey=CloudfrontLoggingBucketName,ParameterValue=$CLOUDFRONT_LOGGING_BUCKET_NAME \

  aws cloudformation wait stack-create-complete \
  --stack-name $BUCKET_STACK_NAME || exit 1
  echo "Done."
  exit
fi

if [ ! \( -f ../server/authorizer.zip -a -f ../server/server.zip \) ]; then
    cat <<"EOF"
You need to run ../server/upload.sh
to create and deploy:
- authorizer.zip
- server.zip

Then you should see these zip files in ../server
These files are the basis for updates to the lambdas that run the cloudefficiency server.
EOF
  exit 1
fi

if [ ! \( "$CLOUDEFFICIENCY_ENV" = 'prod' -o "$CLOUDEFFICIENCY_ENV" = 'dev' \) ]; then
  echo "CLOUDEFFICIENCY_ENV environment variable can only be set to 'dev' or 'prod'"
  exit 1
fi
AUTHORIZER_SHA=$(openssl dgst -sha256 -binary ../server/authorizer.zip | openssl enc -base64)
SERVER_SHA=$(openssl dgst -sha256 -binary ../server/server.zip | openssl enc -base64)

sed -e "s/<SERVER_LAMBDA_VERSION>/$(git rev-parse HEAD)/" ./cloudefficiency.template.yaml > ./cloudefficiency.yaml
sed -i '' "s|<AUTHORIZER_LAMBDA_VERSION>|$(git rev-parse HEAD)|" ./cloudefficiency.yaml

function get_version() {
  aws s3api list-object-versions --bucket cloudefficiency-bucket-lambda-code --prefix $1 | jq -r '.Versions[] | select(.IsLatest) | .VersionId'
}
SERVER_S3_OBJECTVERSION=$(get_version server.zip)
AUTHORIZER_S3_OBJECTVERSION=$(get_version authorizer.zip)

if [ "$OPERATION" = 'up' ]; then

  echo "Creating $IAM_STACK_NAME for cloudefficiency IAM policies and roles."
  aws cloudformation create-stack \
  --stack-name $IAM_STACK_NAME \
  --template-body file://iam.yaml \
  --capabilities \
    CAPABILITY_IAM \
    CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=BucketStackName,ParameterValue=$BUCKET_STACK_NAME

  aws cloudformation wait stack-create-complete \
  --stack-name $IAM_STACK_NAME || exit 1

  echo "Done creating $IAM_STACK_NAME."

  echo "Creating cloudefficiency stack."
  aws cloudformation create-stack \
  --stack-name cloudefficiency \
  --template-body file://cloudefficiency.yaml \
  --capabilities \
    CAPABILITY_IAM \
    CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=EnvType,ParameterValue=$CLOUDEFFICIENCY_ENV \
    ParameterKey=BucketStackName,ParameterValue=$BUCKET_STACK_NAME \
    ParameterKey=IAMStackName,ParameterValue=$IAM_STACK_NAME \
    ParameterKey=NetworkStackName,ParameterValue=$NETWORK_STACK_NAME \
    ParameterKey=AuthorizerLambdaS3ObjectVersion,ParameterValue=$AUTHORIZER_S3_OBJECTVERSION \
    ParameterKey=ServerLambdaS3ObjectVersion,ParameterValue=$SERVER_S3_OBJECTVERSION \
    ParameterKey=CommitSHA,ParameterValue=$(git rev-parse HEAD) \
    ParameterKey=AuthorizerCodeSHA256,ParameterValue=$AUTHORIZER_SHA \
    ParameterKey=ServerCodeSHA256,ParameterValue=$SERVER_SHA \
    ParameterKey=BaseURI,ParameterValue=https://$BASE_URI \
    ParameterKey=ACMCertificateArn,ParameterValue=$ACM_CERT_ARN \
    ParameterKey=CNAME,ParameterValue=$BASE_URI
  exit
  echo "It may take a while for the cloudfront distribution to complete"
fi

CHANGESET_NAME=uuid$RANDOM

echo "Creating change set $CHANGESET_NAME in cloudefficiency stack."
aws cloudformation create-change-set \
--stack-name cloudefficiency \
--change-set-name uuid$RANDOM \
--change-set-type 'UPDATE' \
--template-body file://cloudefficiency.yaml \
--capabilities \
  CAPABILITY_IAM \
  CAPABILITY_NAMED_IAM \
--parameters \
  ParameterKey=EnvType,ParameterValue=$CLOUDEFFICIENCY_ENV \
  ParameterKey=BucketStackName,ParameterValue=$BUCKET_STACK_NAME \
  ParameterKey=IAMStackName,ParameterValue=$IAM_STACK_NAME \
  ParameterKey=NetworkStackName,ParameterValue=$NETWORK_STACK_NAME \
  ParameterKey=AuthorizerLambdaS3ObjectVersion,ParameterValue=$AUTHORIZER_S3_OBJECTVERSION \
  ParameterKey=ServerLambdaS3ObjectVersion,ParameterValue=$SERVER_S3_OBJECTVERSION \
  ParameterKey=CommitSHA,ParameterValue=$(git rev-parse HEAD) \
  ParameterKey=AuthorizerCodeSHA256,ParameterValue=$AUTHORIZER_SHA \
  ParameterKey=ServerCodeSHA256,ParameterValue=$SERVER_SHA \
  ParameterKey=BaseURI,ParameterValue=https://$BASE_URI \
  ParameterKey=ACMCertificateArn,ParameterValue=$ACM_CERT_ARN \
  ParameterKey=CNAME,ParameterValue=$BASE_URI

echo "Please verify and execute the changeset in the AWS cloudformation console."
