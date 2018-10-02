// This file is the root for bundle.js

import { hydrate } from 'react-dom';
import React from 'react';
import App from './app';
import allUsers from './allUsers';

window.hydrate = hydrate
window.allUsers = allUsers;
window.allUsersDict = {};
window.allUsers.forEach((u) => {
  window.allUsersDict[u.user_saml_name] = u;
});

window.App = App;
window.React = React;

if (!window.loaded_count) {
  window.loaded_count = 1;
} else {
  window.do_hydrate();
}
