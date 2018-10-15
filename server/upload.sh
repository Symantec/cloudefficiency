#!/bin/bash
# Archive and upload the lambda code to s3
echo "Archive the lambda code"
rm -rf bundle
rm bundle.zip
./bundle.sh
mv bundle.zip server.zip
pushd authorizer
rm -rf bundle
rm bundle.zip
../bundle.sh
popd
mv ./authorizer/bundle.zip authorizer.zip

echo "Push code archives to s3"
aws s3 cp server.zip s3://$APP_PREFIX-bucket-lambda-code
aws s3 cp authorizer.zip s3://$APP_PREFIX-bucket-lambda-code

rm -rf bundle
rm bundle.zip

pushd authorizer
rm -rf bundle
rm bundle.zip
popd
