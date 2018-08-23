// This file is the template for server sige generated static pages.
import { renderToString } from 'react-dom/server';
import PropTypes from 'prop-types';
import React from 'react';
import App from './app';
import { isOwnedBy } from './util';


const render_page = (env, allUsers, allInstances, userSamlName, timePeriod) => {
  return renderToString(<HTMLTemplate
    userSamlName={userSamlName}
    allUsers={allUsers}
    allInstances={allInstances}
    env={env}
    timePeriod={timePeriod}
  />);
};

const instanceHeaders = (allInstances) => {
  let allTags = {};
  let allAttributes = {};

  const incr_key = (dict, key) => {
    if (!(key in dict)) {
      dict[key] = 0;
    }
    dict[key]++;
  }

  allInstances.forEach(i => {
    i.tags.map(tag => tag.vendorKey).forEach(s => incr_key(allTags, s))
    Object.keys(i).forEach(s => incr_key(allAttributes, s))
  })

  return {
    "attributes": allAttributes,
    "tags": allTags
  };
}


const HTMLTemplate = ({userSamlName, allUsers, allInstances, timePeriod, env}) => {
  let title=(userSamlName ? userSamlName : "VP") + " EC2 c-type rightsizing report";
  let allUsersDict = {};
  allUsers.forEach((u) => {
    allUsersDict[u.user_saml_name] = u;
  });

  if (!timePeriod) {
    timePeriod = (new Date()).toLocaleDateString().replace(/\//g, "_")
  }

  let userInstances = allInstances;
  if (userSamlName) {
    userInstances = allInstances.filter(i => isOwnedBy(i, userSamlName));
  }
  let initialInstances = userInstances.slice(0, 100);
  let userInstanceHeaders = instanceHeaders(userInstances);
  /* requires the following set by bundle.js
      - window.hydrate
      - window.allUsers
      - window.allUsersDict
      - window.App
      - window.React
   */
  const hydrate_js = `
    if (window.location.pathname.search('allocation/') > -1) {
      window.userName = window.location.pathname.split('allocation/')[1].replace('.html', '');
    }
    console.log(window.userName);
    window.timePeriod = '${timePeriod}';
    if (window.location.pathname.split('/').length > 1) {
      window.timePeriod = window.location.pathname.split('/')[1];
    }
    console.log(window.timePeriod);

    window.do_hydrate = function() {
      window.hydrate(
        React.createElement(App, {
          'selectedUser': window.userName,
          'allUsers': window.allUsersDict,
          'initialInstances': ${JSON.stringify(initialInstances)},
          'instanceHeaders': ${JSON.stringify(userInstanceHeaders)},
          'timePeriod': window.timePeriod,
          'env': '${env}',
          'isClient': true
        }, null),
        document.getElementById('root')
      );
    }
    if (!window.loaded_count) {
      window.loaded_count = 1;
    } else {
      window.do_hydrate();
    }
    console.log('hydrated');
  `;

  return (
    //<!DOCTYPE html>
    <html>
      <head>
        <title>{title}</title>
        <script dangerouslySetInnerHTML={{__html: hydrate_js}}></script>
        <script async src={"/"+timePeriod+"/public/bundle.js"}></script>
        <link rel="stylesheet" type="text/css" href={"/"+timePeriod+"/public/index.css"} />
        <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://unpkg.com/react-table@latest/react-table.css" />
        <meta name="viewport" content="width=device-width,initial-scale=1"></meta>
      </head>
      <body>
        <div id="root">
          <App selectedUser={userSamlName} allUsers={allUsersDict} initialInstances={initialInstances} instanceHeaders={userInstanceHeaders} timePeriod={timePeriod} env={env}/>
        </div>
      </body>
      <link rel="icon" href="/favicon.ico" type='image/x-icon'></link>
    </html>
  );
};

HTMLTemplate.propTypes = {
  userSamlName: PropTypes.string,
  allUsers: PropTypes.array.isRequired,
  allInstances: PropTypes.array.isRequired,
  timePeriod: PropTypes.string.isRequired,
  env: PropTypes.string.isRequired
};

export default render_page;
