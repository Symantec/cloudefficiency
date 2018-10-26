#!/bin/bash
set -x
set -e

ACM_CERT_ARN=$1
BASE_URI=$2
APP_PREFIX=$3
KEYMASTER_URI=$4

SSM_KEY_ARN=$(aws kms describe-key --key-id alias/aws/ssm | jq -r .KeyMetadata.Arn)
STATIC_BUCKET_NAME=$APP_PREFIX-bucket-static
LOGGING_BUCKET_NAME=$APP_PREFIX-bucket-logging
REPOSITORY_NAME=$APP_PREFIX-ecr-repository

BUCKET_STACK_NAME=${BUCKET_STACK_NAME:-"$APP_PREFIX-buckets"}
IAM_STACK_NAME=${IAM_STACK_NAME:-"$APP_PREFIX-iam"}
REPOSITORY_STACK_NAME=${REPOSITORY_STACK_NAME:-"$APP_PREFIX-ecr"}
NETWORK_STACK_NAME=${NETWORK_STACK_NAME:-"$APP_PREFIX-network"}
SERVING_STACK_NAME=${SERVING_STACK_NAME:-"$APP_PREFIX-serving"}

# Check for dependencies
## command line arguments
if [[ "$ACM_CERT_ARN" != arn:aws:acm* ]]; then
  echo "First argument must be an acm arn."
  exit 1
fi
if [[ "$BASE_URI" != https://* ]]; then
  echo "Second argument must be an https uri."
  exit 1
fi
: "${APP_PREFIX:?Third argument must be a string to use as an identifier for the app.}"

if [[ "$KEYMASTER_URI" != https://* ]]; then
  echo "Fourth argument must be an https uri of a keymaster."
  exit 1
fi

## environment variables
: "${jwt_secrets:?Need to set jwt_secrets environment variable with secrets to sign JWT}"
: "${client_secret:?Need to set client_secret environment variable with secret for keymaster auth.}"
: "${client_id:?Need to set client_id environment variable with client id for keymaster auth.}"

## AWS environment configured
aws sts get-caller-identity

## docker available
docker info || \
     { echo "deploy.sh needs docker to run"; exit $ERRCODE; }

## prerequisiste cloudformation stacks
NETWORK_STACK_STATUS=$(aws cloudformation list-stacks | jq -r ".StackSummaries[]|select(.StackName==\"$NETWORK_STACK_STATUS\").StackStatus")
if [[ "$NETWORK_STACK_STATUS" != "CREATE_COMPLETE" ]]; then
  echo "cloudformation stack $NETWORK_STACK_NAME must exist before deploy.sh can be run"
  exit 1
fi


# Create resources.
echo "Creating cloudformation resources..."

aws cloudformation create-stack \
--stack-name $IAM_STACK_NAME \
--template-body file://iam.yaml \
--capabilities \
  CAPABILITY_IAM \
  CAPABILITY_NAMED_IAM \
--parameters \
ParameterKey=SSMParamPrefix,ParameterValue=$APP_PREFIX \
ParameterKey=SSMParamKeyARN,ParameterValue=$SSM_KEY_ARN \
ParameterKey=BucketStackName,ParameterValue=$BUCKET_STACK_NAME

aws cloudformation wait stack-create-complete \
--stack-name $IAM_STACK_NAME || exit 1
echo "Created iam resources"

aws cloudformation create-stack \
--stack-name $BUCKET_STACK_NAME \
--template-body file://buckets.yaml \
--parameters \
ParameterKey=StaticBucketName,ParameterValue=$STATIC_BUCKET_NAME \
ParameterKey=LoggingBucketName,ParameterValue=$LOGGING_BUCKET_NAME \

aws cloudformation wait stack-create-complete \
--stack-name $BUCKET_STACK_NAME || exit 1
echo "Created bucket stack resources"

aws cloudformation create-stack \
--stack-name $REPOSITORY_STACK_NAME \
--template-body file://ecr_repo.yaml \
--parameters \
ParameterKey=RepoName,ParameterValue=$REPOSITORY_NAME

aws cloudformation wait stack-create-complete \
--stack-name $REPOSITORY_STACK_NAME || exit 1
echo "Created ECR repository resources."

REPOSITORY_URI=${REPOSITORY_URI:-$(aws ecr describe-repositories --repository-names $REPOSITORY_NAME | jq -r '.repositories[0].repositoryUri')}
IMAGE_NAME="$REPOSITORY_URI:latest"

echo "Building and pushing docker image..."
pushd ..
REGISTRY_ID=$(aws ecr describe-repositories --repository-names $REPOSITORY_NAME | jq -r '.repositories[0].registryId')
$(aws ecr get-login --registry-ids=$REGISTRY_ID --no-include-email)
docker build -t $IMAGE_NAME .
docker push $IMAGE_NAME
popd
echo "Done pushing docker image"

echo "Publishing SSM secrets..."
./publish_ssm_secrets.sh $APP_PREFIX
echo "Done publishing SSM secrets."

echo "Creating final cloudformation stack"
aws cloudformation create-stack \
--stack-name $SERVING_STACK_NAME \
--template-body file://serving_stack.yaml \
--parameters \
ParameterKey=AppName,ParameterValue=$APP_PREFIX \
ParameterKey=ACMCertificateArn,ParameterValue=$ACM_CERT_ARN \
ParameterKey=BaseURI,ParameterValue=$BASE_URI \
ParameterKey=KeymasterURI,ParameterValue=$KEYMASTER_URI \
ParameterKey=ImageURI,ParameterValue=$IMAGE_NAME \
ParameterKey=BucketStackName,ParameterValue=$BUCKET_STACK_NAME \
ParameterKey=IAMStackName,ParameterValue=$IAM_STACK_NAME \
ParameterKey=NetworkStackName,ParameterValue=$NETWORK_STACK_NAME

aws cloudformation wait stack-create-complete \
--stack-name $SERVING_STACK_NAME || exit 1
echo "Created all cloudformation resources."

echo "Uploading dummy index at redirect_index.html"
aws s3 cp redirect_index.html s3://$STATIC_BUCKET_NAME/redirect_index.html --metadata '{"CacheControl": "no-cache"}'

echo "check out the aws cloudformation console to see your new serving resources in $SERVING_STACK_NAME"
