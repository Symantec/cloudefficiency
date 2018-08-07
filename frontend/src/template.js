import PropTypes from 'prop-types';
import React from 'react';

const HTMLTemplate = ({ body, title, timePeriod, env}) => {
  const hydrate_js = {__html: `window.hydrate(
          React.createElement(App, {
            'selectedUser': window.userName,
            'allUsers': window.allUsersDict,
            'allInstances': window.allInstances,
            'timePeriod': window.timePeriod,
            'env': '${env}',
            'isClient': true
          }, null),
          document.getElementById('root')
        );` }
  return (
    //<!DOCTYPE html>
    <html>
      <head>
        <title>{title}</title>
        <link rel="stylesheet" href={"/"+timePeriod+"/public/index.css"} />
        <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossOrigin="anonymous" />


        <meta name="viewport" content="width=device-width,initial-scale=1"></meta>
      </head>
      <body>
        <div id="root">{body}</div>
      </body>
      <link rel="icon" href="http://***REMOVED***/favicon.png" type='image/x-icon'></link>
      <script src={"/"+timePeriod+"/public/bundle.js"}></script>
      <script dangerouslySetInnerHTML={hydrate_js}>
      </script>
    </html>
  );
};

HTMLTemplate.propTypes = {
  title: PropTypes.string.isRequired,
  body: PropTypes.element.isRequired,
  env: PropTypes.string.isRequired
};

export default HTMLTemplate;
