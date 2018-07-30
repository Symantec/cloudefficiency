import PropTypes from 'prop-types';
import React from 'react';

import Instances from './instances';

const TopBar = () => (
  <header id="top_bar">
  header
  </header>
);
const BottomBar = () => (
  <footer id="bottom_bar">
  footer
  </footer>
);
const User = ({user}) => (
  <div>User {user.user_saml_name} </div>
);

const UserSelect = ({targetUser, users}) => {
  return (
    <div id="user_select">
    <div>
      <span>Selected Users</span>
    </div>
    <div>
    </div>
    <ol>
      {users.map((user) => <User user={user} key={user.user_saml_name} />)}
    </ol>

    </div>
  );
};

const App = ({selectedUser, allUsers, allInstances, timePeriod}) => {
  let targetUser = allUsers[selectedUser] || { reports: [] };
  let users = (targetUser.reports || []).map((name) => {
    if (!(name in allUsers)) {
      console.log('WHAT?:' + name);
      return undefined;
    }
    return allUsers[name];
  }).filter((x) => x);
  return (
    <React.Fragment>
      <TopBar />
      <UserSelect targetUser={targetUser} users={users}/>
      <Instances instances={allInstances} />
      <BottomBar />
    </React.Fragment>
  );
};

let userShape = PropTypes.shape({
  cost: PropTypes.number.isRequired,
  org_cost: PropTypes.number.isRequired,
  org_waste: PropTypes.number.isRequired,
  reports: PropTypes.arrayOf(PropTypes.string.isRequired),
  user_saml_name: PropTypes.string.isRequired,
  waste: PropTypes.number.isRequired
})

App.propTypes = {
  selectedUser: PropTypes.string.isRequired,
  allUsers: PropTypes.objectOf(userShape).isRequired,
  allInstances: PropTypes.array.isRequired,
  timePeriod: PropTypes.string.isRequired
};

export default App;

