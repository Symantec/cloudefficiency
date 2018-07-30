# EC2 c-type instance cost/waste interactive reports by team and manager.
Three stages to produce EC2 c-type instance cost/waste interactive reports.
ldap data + instance data -> user hierarchy and instance data -> static html/js isomorphic React pages.

## First two stages in python
`python3 -m report.allocate_efficiency`

### preparing raw data
1. gets ldap data for user hierarchy, and dl lists.
2. gets rightsizing recommendations for instances from cloudability.

caches data to:
- ldap_entries.pickle
- dl_owners.pickle
- rightsizing_cache.json

### attributing ownership
3. assigns cost and waste to each individual
4. aggregate costs and wastes up reporting chain

outputs:
- allInstances.js jsonp file
- allUsers.js jsonp file

`mv all*.js to frontend/src/`

# generating reports
node ./dist/generate_files.js

cwd has `./output/*.html`
`./public/index.css` has styling
`./public/bundle.js` has js and user/instance data



