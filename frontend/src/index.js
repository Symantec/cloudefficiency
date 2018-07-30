import { hydrate } from 'react-dom';
import React from 'react';
import App from './app';
import allUsers from './allUsers';
import allInstances from './allInstances';

window.hydrate = hydrate
if (window.location.pathname.search('allocation/') > -1) {
  window.userName = window.location.pathname.split('allocation')[1];
}
window.allUsers = allUsers;
window.allUsersDict = {};
window.allUsers.forEach((u) => {
  window.allUsersDict[u.user_saml_name] = u;
});

window.allInstances = allInstances;
window.App = App;
window.React = React;
window.timePeriod = 'now';

