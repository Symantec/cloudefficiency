import render_page from './page_template';
import allUsers from './allUsers';
import allInstances from './allInstances';
import mkdirp from 'mkdirp';
import fs from 'graceful-fs';
import path from 'path';


let timePeriod = (new Date()).toLocaleDateString().replace(/\//g, "_");
let dir = '../output/' + timePeriod + '/allocation/'

let render = () => {
  allUsers.forEach((u) => {
    let fileBody = render_page('prod', allUsers, allInstances, u.user_saml_name, timePeriod);
    fs.writeFile(dir + u.user_saml_name + ".html", fileBody, (err) => {
      console.log(dir + u.user_saml_name + ".html");
      if(err) {
        return console.error(err);
        process.exit(1);
      }
    });
  })

  let fileBody = render_page('prod', allUsers, allInstances);
  console.log(dir + 'index.html');
  fs.writeFile(dir + 'index.html', fileBody, (err) => {
    if(err) {
      return console.log(err);
    }
    process.exit(0);
  });
};

mkdirp(dir, (err) => {
    if (err) {
      console.error(err);
    } else {
      render();
    }
});
