import React from 'react';
import App from './app';
import { renderToString } from 'react-dom/server';
import HTMLTemplate from './template';
import allUsers from './allUsers';
import allInstances from './allInstances';
import mkdirp from 'mkdirp';
import fs from 'graceful-fs';
import path from 'path';

let timePeriod = (new Date()).toLocaleDateString().replace(/\//g, "_")

let allUsersDict = {};
allUsers.forEach((u) => {
  allUsersDict[u.user_saml_name] = u;
});

let dir = './output/' + timePeriod + '/allocation/'

let render = () => {
  allUsers.forEach((u) => {
    let fileBody = renderToString(<HTMLTemplate
      body={<App selectedUser={u.user_saml_name} allUsers={allUsersDict} allInstances={allInstances} timePeriod={timePeriod}/>}
      title={u.user_saml_name + " EC2 c-type rightsizing report"}
      timePeriod={timePeriod}
    />);
    console.log(dir + u.user_saml_name + ".html");
    fs.writeFile(dir + u.user_saml_name + ".html", fileBody, (err) => {
      if(err) {
        return console.error(err);
        process.exit(1);
      }
    });
  })

  let fileBody = renderToString(<HTMLTemplate
    body={<App allUsers={allUsersDict} allInstances={allInstances} timePeriod={timePeriod}/>}
    title={"VP EC2 c-type rightsizing report"}
    timePeriod={timePeriod}
  />);
  console.log(dir + 'index.html');
  fs.writeFile(dir + 'index.html', fileBody, (err) => {
    if(err) {
      return console.log(err);
    }
  });
};

mkdirp(dir, (err) => {
    if (err) {
      console.error(err);
    } else {
      render();
    }
});
