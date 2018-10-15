#!/bin/bash
set -x
pushd ../server
 ./upload.sh || exit
popd

echo "Publish a new lambda version"
REVISION_ID=$(aws lambda update-function-code \
--function-name cloudefficiency-lambda \
--s3-bucket $APP_PREFIX-bucket-lambda-code \
--s3-key server.zip | jq -r '.RevisionId')
CODE_SHA=$(openssl dgst -sha256 -binary ../server/server.zip | openssl enc -base64)
CODE_COMMIT=git-$(git rev-parse HEAD)

aws lambda publish-version \
--function-name cloudefficiency-lambda \
--code-sha-256 $CODE_SHA \
--description $CODE_COMMIT \
--revision-id $REVISION_ID > version.json

VERSION=$(cat version.json | jq -r .Version)
rm version.json

echo "Create or update the alias"
if [ -z "$CREATE_STACKS" ]; then
  aws cloudformation create-change-set \
  --change-set-name $APP_PREFIX-lambda-version-$CODE_COMMIT \
  --stack-name $APP_PREFIX-lambda-alias \
  --change-set-type 'UPDATE' \
  --template-body file://lambda_alias.yaml \
  --parameters \
    ParameterKey=LambdaVersion,ParameterValue=$VERSION \
    > alias-change-set.json
else
  aws cloudformation create-change-set \
  --change-set-name $APP_PREFIX-lambda-version-$CODE_COMMIT \
  --stack-name $APP_PREFIX-lambda-alias \
  --change-set-type 'CREATE' \
  --template-body file://lambda_alias.yaml \
  --parameters \
    ParameterKey=LambdaVersion,ParameterValue=$VERSION \
    > alias-change-set.json
fi

aws cloudformation wait change-set-create-complete \
--change-set-name $(cat alias-change-set.json | jq -r .Id)

aws cloudformation execute-change-set \
--change-set-name $(cat alias-change-set.json | jq -r .Id)
rm alias-change-set.json

if [ -n "$CREATE_STACKS" ]; then
  aws cloudformation create-stack \
  --stack-name $APP_PREFIX-lambda-permissions \
  --template-body file://lambda_permissions.yaml \
  --parameters \
    ParameterKey=APIStackName,ParameterValue=$APP_PREFIX-api \
    ParameterKey=LambdaAliasStackName,ParameterValue=$APP_PREFIX-lambda-alias

  aws cloudformation wait stack-create-complete \
  --stack-name $APP_PREFIX-lambda-permissions
fi


echo "Create a new deployment"
cat << 'EOF' > ./temp_deployment.yaml
AWSTemplateFormatVersion: 2010-09-09
Parameters:
  APIStackName:
    Type: 'String'
    Description: >
      The name of the stack which includes
      RestApi
Resources:
  APIDeployement:
    Type: AWS::ApiGateway::Deployment
    Properties:
      RestApiId:
        Fn::ImportValue:
          !Sub "${APIStackName}-RestApi"
      Description: "Deployment"
Outputs:
  Deployment:
    Description: Api Dployment
    Value: !Ref APIDeployement
    Export:
      Name:
        Fn::Sub: "${AWS::StackName}-Deployment"

EOF
aws cloudformation create-change-set \
--change-set-name $APP_PREFIX-api-$CODE_COMMIT \
--stack-name $APP_PREFIX-api-deployment-$CODE_COMMIT \
--template-body file://temp_deployment.yaml \
--change-set-type 'CREATE' \
--parameters \
  ParameterKey=APIStackName,ParameterValue=$APP_PREFIX-api \
  > deployment-change-set.json

aws cloudformation wait change-set-create-complete \
--change-set-name $(cat deployment-change-set.json | jq -r .Id)

aws cloudformation execute-change-set \
--change-set-name $(cat deployment-change-set.json | jq -r .Id)
rm deployment-change-set.json
rm temp_deployment.yaml

if [ -z "$CREATE_STACKS" ]; then
  aws cloudformation create-change-set \
  --change-set-type 'UPDATE' \
  --change-set-name $APP_PREFIX-api-stage-$CODE_COMMIT \
  --stack-name $APP_PREFIX-api-stage \
  --template-body file://api_stage.yaml \
  --parameters \
    ParameterKey=APIStackName,ParameterValue=$APP_PREFIX-api \
    ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets \
    ParameterKey=DeploymentStackName,ParameterValue=$APP_PREFIX-api-deployment-$CODE_COMMIT \
    ParameterKey=BaseURI,ParameterValue=https://$APP_URL \
    > api-change-set.json
else
  aws cloudformation create-change-set \
  --change-set-type 'CREATE' \
  --change-set-name $APP_PREFIX-api-stage-$CODE_COMMIT \
  --stack-name $APP_PREFIX-api-stage \
  --template-body file://api_stage.yaml \
  --parameters \
    ParameterKey=APIStackName,ParameterValue=$APP_PREFIX-api \
    ParameterKey=BucketStackName,ParameterValue=$APP_PREFIX-buckets \
    ParameterKey=DeploymentStackName,ParameterValue=$APP_PREFIX-api-deployment-$CODE_COMMIT \
    ParameterKey=BaseURI,ParameterValue=https://$APP_URL \
  > api-change-set.json
fi
aws cloudformation wait change-set-create-complete \
--change-set-name $(cat api-change-set.json | jq -r .Id)

aws cloudformation execute-change-set \
--change-set-name $(cat api-change-set.json | jq -r .Id)
rm api-change-set.json
