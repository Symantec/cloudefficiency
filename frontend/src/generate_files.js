import React from 'react';
import App from './app';
import { renderToString } from 'react-dom/server';
import HTMLTemplate from './template';
import allUsers from './allUsers';
import allInstances from './allInstances';
import fs from 'fs';
import path from 'path';

let allUsersDict = {};
allUsers.forEach((u) => {
  allUsersDict[u.user_saml_name] = u;
});
allUsers.forEach((u) => {
  let timePeriod = 'now';
  
  if (u.reports.length > 0) {
    let fileBody = renderToString(<HTMLTemplate
      body={<App selectedUser={u.user_saml_name} allUsers={allUsersDict} allInstances={allInstances} timePeriod={timePeriod}/>}
      title={u.user_saml_name + " EC2 c-type rightsizing report"}
    />);
    fs.writeFile("./output/" + u.user_saml_name + ".html", fileBody, (err) => {
      if(err) {
        return console.log(err);
      }
    });
  }
})
