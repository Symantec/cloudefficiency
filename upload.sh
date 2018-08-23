# sudo pip install awscli
set -e
set -x

export DATE=`date '+%-m_%-d_%Y'`
echo "Generating files for $DATE"

# create output/<date>/{allUsers.js|allInstances.js}
python3 -m report.allocate_efficiency

# save intermediate data
aws s3 cp dl_owners.pickle s3://$DATA_BUCKET/$DATE/dl_owners.pickle
aws s3 cp ldap_entries.pickle s3://$DATA_BUCKET/$DATE/ldap_entries.pickle
aws s3 cp rightsizing_cache.json s3://$DATA_BUCKET/$DATE/rightsizing_cache.json

ls

mv output/$DATE/all* frontend/src/
cd frontend

# create bundle.js
node --max-old-space-size=4096 ./node_modules/grunt/bin/grunt prod

cp public/logo.svg ../output/$DATE/public/

node --max-old-space-size=6144 dist/generate_files.js

# upload documents
aws s3 sync ../output/$DATE/ s3://$BUCKET/$DATE/

# update index redirect
envsubst < s3_redirect.template.json > website.json
envsubst < redirect_index.template.html > redirect_index.html
aws s3api put-bucket-website --bucket $BUCKET --website-configuration file://website.json
aws s3 cp redirect_index.html s3://$BUCKET/redirect_index.html --metadata '{"CacheControl": "no-cache"}'

