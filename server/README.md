# Deploying:
## deploy.sh Prerequisites:
- aws credentials for CLI
- local docker daemon
- Create bucket
- environment variables:
  - jwt_secrets: jwt_secrets environment variable with secrets to sign JWT.
  - client_secret: client_secret environment variable with secret for keymaster auth.
  - client_id: client_id environment variable with client id for keymaster auth.

```
./deploy.sh <CERT_ARN> <https://mysecurityscorecard.mysite.com> <my_app_name> <https://keymaster.mysite.com>
```


# Running locally: generate self signed cert and run the python server.
```
# your configuration...
export WEBSITE=my.example.com
export BUCKET_NAME=my-bucket-name
export KEYMASTER=my-keymaster-host
export CLIENT_ID=...from keymaster
export CLIENT_SECRET=...from keymaster
export JWT_SECRET=...from keymaster

cd ./selfsign
docker build -t selfsign .
docker run -e "WEBSITE=$WEBSITE" -v `pwd`/output:/output selfsign
```
 # redirect <yourwebsite> to 127.0.0.1
sudo bash -c "echo '127.0.0.1  $WEBSITE' >> /etc/hosts"
 # run python server
```
pip3 install -r requirements.txt

export authorization_endpoint=https://$KEYMASTER/idp/oauth2/authorize
export token_endpoint=https://$KEYMASTER/idp/oauth2/token
export userinfo_endpoint=https://$KEYMASTER/idp/oauth2/userinfo
export base_uri=https://$WEBSITE
export redirect_uri=$base_uri/callback
export default_object=redirect_index.html
export bucket_name=$BUCKET_NAME

# publish secrets to aws ssm.
export client_id=$CLIENT_ID
export client_secret=$CLIENT_SECRET
export jwt_secrets=$JWT_SECRET

export ENV=dev

./publish_ssm_secrets.sh

export DEBUG=true

# sudo because we're binding 443
sudo -E python3 app.py
```
