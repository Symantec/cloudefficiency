# sudo pip install awscli

export DATE=`date '+%-m_%-d_%Y'`
echo "Generating files for $DATE"

# create output/<date>/{allUsers.js|allInstances.js}
python3 -m report.allocate_efficiency

mv output/$DATE/all* frontend/src/
cd frontend

# create bundle.js
./node_modules/grunt/bin/grunt prod

cp public/* output/$DATE/public/

node dist/generate_files.js

# upload documents
aws s3 sync ./output/$DATE/ s3://$BUCKET/$DATE/

# update index redirect
envsubst < s3_redirect.template.json > website.json
envsubst < redirect_index.template.html > redirect_index.html
aws s3api put-bucket-website --bucket $BUCKET --website-configuration file://website.json
aws s3 cp redirect_index.html s3://$BUCKET/redirect_index.html

