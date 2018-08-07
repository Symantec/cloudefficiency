# sudo pip install awscli

export DATE=`date '+%-m_%-d_%Y'`

# create output/<date>/{allUsers.js|allInstances.js}
time python3 -m report.allocate_efficiency

mv output/$DATE/all* frontend/src/
cd frontend

# create bundle.js
grunt prod

cp public/* output/$DATE/public/

node dist/generate_files.js

# upload documents
export AWS_PROFILE=***REMOVED***
aws s3 sync ./output/8_6_2018/ s3://***REMOVED***/8_6_2018/

# update index redirect
envsubst < s3_redirect.json > website.json.new
aws s3api put-bucket-website --bucket ***REMOVED*** --website-configuration file://website.json.new

