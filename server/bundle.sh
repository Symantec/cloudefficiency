#!/bin/bash
mkdir bundle
cp lambda_function.py bundle/
pip install -r requirements.txt -t ./bundle
pushd bundle
zip -r ../bundle.zip *
popd
