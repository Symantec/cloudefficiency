import PropTypes from 'prop-types';
import React from 'react';

import Instances from './instances';
import VPLIST from './vpList';

import { formatMoneyAnnual, formatMoneyAnnualIcon, formatName } from './formats';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import Analytics from './analytics';


Analytics.setup();


const TopBar = ({timePeriod}) => {
  const home_url = "/"+timePeriod+"/allocation/";
  return (
    <header id="top_bar">
    <a href={home_url} onClick={() => Analytics.record({
      name: 'click',
      attributes: { target: 'logo' }
    })}>
      <img src={"/"+timePeriod+"/public/logo.svg"} alt="CPE logo" />
    </a>
    <span className="title">
      <span>Cloud Efficiency c-type Rightsizing</span>
    </span>
    <a href="https://github.com/Symantec/cloudefficiency/issues" onClick={() => Analytics.record({
      name: 'click',
      attributes: { target: 'issues' }
    })}>Issues<i className="fab fa-github"></i></a>
    </header>
  );
};
const BottomBar = () => (
  <footer id="bottom_bar">
    <span><i className="far fa-copyright"></i> 2018 CPE | Jack Phelan</span>
  </footer>
);
const User = ({user, timePeriod}) => {
  let url = `/${timePeriod}/allocation/${user.user_saml_name}.html`;
  return (
    <React.Fragment>
      <span className="a_wrapper zebra"><a href={url} onClick={() => Analytics.record({
        name: 'click',
        attributes: {
            target: 'teammember',
            targetUser: user.user_saml_name
        }
      })}>{formatName(user.user_saml_name)}</a></span>
      <span className="zebra">{formatMoneyAnnualIcon(user.org_waste, user.org_instance_count)}</span>
    </React.Fragment>
  );
}

const UserSelect = ({targetUser, manager, users, timePeriod}) => {
  let userSection;
  let totalWaste;
  let totalInstanceCount;
  let manager_el
  if (manager) {
    let manager_url = `/${timePeriod}/allocation/${manager}.html`;
    manager_el = (<span>Manager: <a href={manager_url} onClick={() => Analytics.record({
        name: 'click',
        attributes: {
            target: 'manager',
            targetUser: manager.user_saml_name
        }
    })}>{formatName(manager)}</a></span>);
  }
  if (targetUser) {
    userSection = (
      <React.Fragment>
        <h2>{formatName(targetUser.user_saml_name)}</h2>
        <div><span>Personal potential annual savings: </span></div>
        <div><span>{formatMoneyAnnualIcon(targetUser.waste, targetUser.instance_count)}</span></div>
        <div>{manager_el}</div>
      </React.Fragment>
    );
    totalWaste = targetUser.org_waste;
    totalInstanceCount = targetUser.org_instance_count;
  } else {
    userSection = (<h2>Leadership Team</h2>);
    totalWaste = users.map((u) => u.org_waste).reduce((a, b) => a + b, 0);
    totalInstanceCount = users.map((u) => u.org_instance_count).reduce((a, b) => a + b, 0);
  }
  let users_ordered = users.sort((a,b) => {
    if (a.org_waste !== b.org_waste) {
      return b.org_waste - a.org_waste;
    }
    return a.user_saml_name.localeCompare(b.user_saml_name);
  });
  let tooltip;
  if (targetUser) {
    tooltip = (
      <Tooltip id="tooltip">
        You are looking at Annualized potential savings based on the 10 day period ending at {timePeriod} for {formatName(targetUser.user_saml_name)}
        { users.length > 0 && ' and team.' }
        {' ' + formatName(targetUser.user_saml_name)}'s personal potential savings 
        { users.length > 0 && ' plus their team\'s' } = {formatMoneyAnnual(totalWaste)}.
      </Tooltip>
    );
  } else {
    tooltip = (
      <Tooltip id="tooltip">
        You are looking at Annualized potential savings based on the 10 day period ending at {timePeriod} for the leadership group.
      </Tooltip>
    );
  }
  return (
    <div id="user_select">
      <div className="top_section">
        {userSection}
        <div className="fill_space"></div>
        <OverlayTrigger onMouseOver={() => Analytics.record({
          name: 'tooltip',
          attributes: { target: 'leadership' }
        })} placement="bottom" overlay={tooltip}>
          <i className="far fa-question-circle"></i>
        </OverlayTrigger>
      </div>
    { users.length > 0 && 
        <div className="user_section">
          <div className="bar"></div>
          <span>{targetUser ? 'Direct Reports' : 'Team Member'}</span>
          <span>Potential Annual Savings</span>
          <div className="bar"></div>
          {users_ordered.map((user) => <User user={user} key={user.user_saml_name} timePeriod={timePeriod} />)}
          <div className="bar"></div>
          <span>Team Total:</span>
          <span>{formatMoneyAnnualIcon(totalWaste, totalInstanceCount)}</span>
        </div>
    }
    </div>
  );
};

class App extends React.Component {
  componentDidMount() {
    if (this.props.isClient) {
      let env = this.props.env || 'dev';
      console.log('env:' + env);
      Analytics.defaultInfo({
        userName: window.userName,
        timePeriod: window.timePeriod,
        env: env
      })
      Analytics.record({ name: 'AppMount'});
    }
  }
  render() {
    let {selectedUser, allUsers, allInstances, timePeriod, isClient} = this.props;
    let userNames = VPLIST;
    let targetUser;
    let manager;
    if (selectedUser) {
      if (!(selectedUser in allUsers)) {
        console.error('UKNOWN USER:' + selectedUser);
      } else {
        targetUser = allUsers[selectedUser];
        userNames = (targetUser.reports || []);
        if (targetUser.manager in allUsers) {
          manager = targetUser.manager;
        }
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
      ownerNames.push(targetUser.user_saml_name);
    }
    const isOwnedBy = (i, ownerNames) => {
      let intersection =  i.owners.filter(o => ownerNames.includes(o))
      return intersection.length > 0;
    }
    return (
      <React.Fragment>
        <TopBar timePeriod={timePeriod} />
        <UserSelect targetUser={targetUser} manager={manager} users={users} timePeriod={timePeriod} />
        <Instances instances={allInstances.filter(i => isOwnedBy(i, ownerNames))} timePeriod={timePeriod} />
        <BottomBar />
      </React.Fragment>
    );
  }
};

let userShape = PropTypes.shape({
  cost: PropTypes.number.isRequired,
  org_cost: PropTypes.number.isRequired,
  org_waste: PropTypes.number.isRequired,
  org_instance_count: PropTypes.number.isRequired,
  instance_count: PropTypes.number.isRequired,
  reports: PropTypes.arrayOf(PropTypes.string.isRequired),
  user_saml_name: PropTypes.string.isRequired,
  waste: PropTypes.number.isRequired
})

App.propTypes = {
  selectedUser: PropTypes.string,
  allUsers: PropTypes.objectOf(userShape).isRequired,
  allInstances: PropTypes.array.isRequired,
  timePeriod: PropTypes.string.isRequired,
  env: PropTypes.string.isRequired,
  isClient: PropTypes.bool
};

export default App;

