import PropTypes from 'prop-types';
import React from 'react';

import Instances from './instances';
import VPLIST from './vpList';

import { formatMoney, formatName } from './formats';


const TopBar = () => (
  <header id="top_bar">
  <img src="/public/logo.svg" alt="CPE logo" />
  <span className="title">
    <span>Cloud Efficiency c-type Rightsizing: 10 Days</span>
  </span>
  <a href="https://github.com/Symantec/cloudefficiency/issues">Issues<i className="fab fa-github"></i></a>
  </header>
);
const BottomBar = () => (
  <footer id="bottom_bar">
    <span><i className="far fa-copyright"></i> 2018 CPE | Jack Phelan</span>
  </footer>
);
const User = ({user, timePeriod}) => {
  let url = `/${timePeriod}/allocation/${user.user_saml_name}`;
  return (
    <React.Fragment>
      <span className="a_wrapper zebra"><a href={url}>{formatName(user.user_saml_name)}</a></span>
      <span className="money zebra">{formatMoney(user.org_waste)}</span>
    </React.Fragment>
  );
}

const UserSelect = ({targetUser, users, timePeriod}) => {
  let userSection;
  let totalWaste;
  if (targetUser) {
    userSection = (<h2>{formatName(targetUser.user_saml_name)}</h2>);
    totalWaste = targetUser.org_waste;
  } else {
    userSection = (<h2>Vice Presidents</h2>);
    totalWaste = users.map((u) => u.org_waste).reduce((a, b) => a + b, 0);
  }
  return (
    <div id="user_select">
      <div className="top_section">
        {userSection}
        <div className="fill_space"></div>
        <i className="far fa-question-circle"></i>
      </div>
    { users.length > 0 && 
        <div className="user_section">
          <div className="bar"></div>
          <span>Team Member</span>
          <span>Potential Savings</span>
          <div className="bar"></div>
          {users.sort((a,b) => b.org_waste - a.org_waste).map((user) => <User user={user} key={user.user_saml_name} timePeriod={timePeriod} />)}
          <div className="bar"></div>
          <span>Total:</span>
          <span className="money">{formatMoney(totalWaste)}</span>
        </div>
    }
    </div>
  );
};

const App = ({selectedUser, allUsers, allInstances, timePeriod}) => {
  let userNames = VPLIST;
  let targetUser;
  if (selectedUser) {
    if (!(selectedUser in allUsers)) {
      console.error('UKNOWN USER:' + selectedUser);
    } else {
      targetUser = allUsers[selectedUser];
      userNames = (targetUser.reports || []);
    }
  }
  let users = userNames.map((name) => {
    if (!(name in allUsers)) {
      console.error('UNKNOWN REPORT:' + name);
      return undefined;
    }
    return allUsers[name];
  }).filter((x) => x);
  let ownerNames = users.map((u) => u.user_saml_name)
  if (targetUser) {
    ownerNames.push(targetUser);
  }
  const isOwnedBy = (i, ownerNames) => i.owners.filter(o => -1 !== ownerNames.indexOf(o)).length > 0;
  return (
    <React.Fragment>
      <TopBar />
      <UserSelect targetUser={targetUser} users={users} timePeriod={timePeriod} />
      <Instances instances={allInstances.filter(i => isOwnedBy(i, ownerNames))} timePeriod={timePeriod} />
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
  selectedUser: PropTypes.string,
  allUsers: PropTypes.objectOf(userShape).isRequired,
  allInstances: PropTypes.array.isRequired,
  timePeriod: PropTypes.string.isRequired
};

export default App;

