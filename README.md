
# Cloud Efficiency Report
![Screenshot](https://github.com/Symantec/cloudefficiency/raw/master/cloudefficiency.png)

# To run the report
1. Install minikube
https://kubernetes.io/docs/tasks/tools/install-minikube/

2. To run:
#### Option 1
```
eval $(minikube docker-env)
docker build -t cloudefficiency .
kubectl create secret generic cloudefficiency-config --from-file=./report/config.json --from-file=./frontend/src/config.js
kubectl create secret generic cloudefficiency-aws-credentials --from-file=~/.aws
export BUCKET=mybucket
export DATA_BUCKET=mydatabucket
export AWS_PROFILE=myprofile
envsubst < cronjob.yaml | kubectl create -f -
kubectl create job --from=cronjob/cloudefficiency-cronjob cloudefficiency-job
```
#### Option 2
                  
```
docker build . -t cloudefficiency
docker run -it \
  -v `pwd`'/frontend/src/config.js:/app/frontend/src/config.js' \
  -v `pwd`'/report/config.json:/app/report/config.json' \
  -v "$HOME/.aws/:/root/.aws/" \
  -e "BUCKET=$BUCKET" \
  -e "DATA_BUCKET=$DATA_BUCKET" \
  -e "AWS_PROFILE=$AWS_PROFILE" \
  cloudefficiency
```

# EC2 c-type instance cost/waste interactive reports by team and manager.
There are 3 stages to produce EC2 c-type instance cost/waste interactive reports.
ldap data + instance data -> user hierarchy and instance data -> static html/js isomorphic React pages.

## First 2 stages in python
`python3 -m report.allocate_efficiency`

### Preparing raw data
1. Gets ldap data for user hierarchy, and dl lists.
2. Gets rightsizing recommendations for instances from cloudability.

caches data to:
- ldap_entries.pickle
- dl_owners.pickle
- rightsizing_cache.json

### Attributing ownership
3. Assigns cost and waste to each individual
4. Aggregate costs and wastes up reporting chain

#### Outputs:
- allInstances.js jsonp file
- allUsers.js jsonp file

`mv all*.js to frontend/src/`

# Generating reports
node ./dist/generate_files.js

cwd has `./output/*.html`
`./public/index.css` has styling
`./public/bundle.js` has js and user/instance data

# Testing
## Frontend
Frontend code is tested with Jest and Enzyme.
To run tests:
`npm test`

# Debugging

## Frontend
Either insert `console.log` statements, or you can debug using jest:
`node --inspect-brk node_modules/.bin/jest --runInBand`
and open `chrome://inspect` in chrome
[more details] (https://jestjs.io/docs/en/troubleshooting_

# Configuration files
`logo.svg` in `frontend/public/logo.svg`
`config.js` in `frontend/src/config.js`
```
const awsmobile = {
    'aws_app_analytics': 'enable',
    'aws_mobile_analytics_app_id': <string>,
    'aws_mobile_analytics_app_region': <string>,
    'aws_project_id': <string>,
    'aws_project_name': <string>,
    'aws_project_region': <string>,
    'aws_resource_name_prefix': <string>
}
const VPLIST = [<string>...]
const HELP_LINK = 'https://slack.com/app_redirect?channel=cloudefficiency';
const HELP_TEXT = 'slack channel';

export { awsmobile, VPLIST, HELP_TEXT, HELP_LINK };

```
`config.json` in `report/config.json`
```
{
  "ldap_url": <string>,
  "ldap_port": <number>,
  "ldap_basedn": <string>,
  "ldap_binddn": <string>,
  "ldap_bindpw": <string>,
  "ldab_dl_basedn": <string>,
  "ldap_dl_search_filter_template": <string>,
  "ldap_search_filter": <string>,
  "ldap_searchreq_attrlist": [<string>...],
  "ldap_users_cache_file": <filename>,
  "ldap_cache_time": <number>,
  "cloudability_api_key": <string>,
  "VP_LIST": [<string>...]
}

```


## Analytics Events

Root Render (document.referrer, page)
{
    name: 'appRender'
});


Analytics.updateEndpoint({
    page: ...,
    referrer: ...,
})

Click CPE logo
{
    name: 'click',
    attributes: {
        target: 'logo'
    },
});

Click issues
{
    name: 'click',
    attributes: {
        target: 'issues'
    },
});

Click help
{
    name: 'click',
    attributes: {
        target: 'help'
    },
});

Click teammember
{
    name: 'click',
    attributes: {
        target: 'teammember',
        targetUser: 'name'
    },
});

Click manager
{
    name: 'click',
    attributes: {
        target: 'manager',
        targetUser: 'name'
    },
});

Click owner
{
    name: 'click',
    attributes: {
        target: 'instanceOwner',
        targetUser: 'name',
        targetInstance: 'id'
    },
});

Click ownerVp
{
    name: 'click',
    attributes: {
        target: 'pwmerVP',
        targetUser: 'name',
        targetInstance: 'id'
    },
});

hover tooltip
{
    name: 'tooltip',
    attributes: {
        target: 'leadership' | 'user' | 'id' | 'type' | 'suggest' | 'waste' | 'cost' | 'owner' | 'vpOwner' | 'attribution', 'moneyExplanation,
    },
});
{
    name: 'tooltip',
    attributes: {
        target: 'attribution',
        targetUser: 'name'
    },
});
