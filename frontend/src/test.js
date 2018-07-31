import React from 'react';
import App from './app';
import express from 'express';
import { renderToString } from 'react-dom/server';
import HTMLTemplate from './template';
import allUsers from './allUsers';
import allInstances from './allInstances';

require('source-map-support').install();
process.on('unhandledRejection', console.log);

let allUsersDict = {};
allUsers.forEach((u) => {
  allUsersDict[u.user_saml_name] = u;
});

const server = express();

server.use('/public', express.static('public'));

server.get('/', allocation);
server.get('/:timePeriod/allocation', allocation);
server.get('/:timePeriod/allocation/:userSamlName', allocation);

function allocation(req, res) {

  let timePeriod = req.params.timePeriod;
  if (!timePeriod) {
    timePeriod = 'now';
  }

  let userSamlName = req.params.userSamlName;

  res.send(renderToString(<HTMLTemplate
    body={<App selectedUser={userSamlName} allUsers={allUsersDict} allInstances={allInstances} timePeriod={timePeriod}/>}
    title={'Hello World'}
  />));
};

server.listen(8080);
