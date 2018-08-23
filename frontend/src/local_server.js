import express from 'express';
import render_page from './page_template';
import allUsers from './allUsers';
import allInstances from './allInstances';

require('source-map-support').install();
process.on('unhandledRejection', console.log);

let allUsersDict = {};
allUsers.forEach((u) => {
  allUsersDict[u.user_saml_name] = u;
});

const server = express();

server.use('/*/public', express.static('public'));

server.get('/', allocation);
server.get('/:timePeriod/allocation', allocation);
server.get('/:timePeriod/allocation/:userSamlName', allocation);

function allocation(req, res) {

  let timePeriod = req.params.timePeriod;
  let userSamlName = req.params.userSamlName
  if (userSamlName) {
    userSamlName = userSamlName.replace('.html', '');
  }

  let fileBody = render_page('dev', allUsers, allInstances, userSamlName, timePeriod);
  res.send(fileBody);
};

server.listen(8080);
