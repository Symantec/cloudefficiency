import PropTypes from 'prop-types';
import React, { Component } from 'react';
import VPLIST from './vpList';
import { formatMoneyAnnual, formatName } from './formats';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import Analytics from './analytics';

let vps = {}

VPLIST.forEach((s) => vps[s] = true);

const Instance = ({instance, timePeriod}) => {
  let potentialVPs = instance.owners.filter((s) => s in vps);
  let vp = "None";
  let vp_el = (<span>{vp}</span>);
  let owner = "None";
  let owner_el = (<span>{owner}</span>);
  if (potentialVPs.length > 0) {
    vp = potentialVPs[0];
    let url = `/${timePeriod}/allocation/${vp}.html`;
    vp_el = <a href={url} onClick={() => Analytics.record({
      name: 'click',
      attributes: {
          target: 'ownerVP',
          targetUser: vp,
          targetInstance: 'id'
      },
    })}>{formatName(vp)}</a>
  }
  if (instance.owners.length > 0) {
    owner = instance.owners[0];
    let url = `/${timePeriod}/allocation/${owner}.html`;
    owner_el = (<a href={url} onClick={() => Analytics.record({
      name: 'click',
      attributes: {
          target: 'instanceOwner',
          targetUser: owner,
          targetInstance: 'id'
      },
    })}>{formatName(owner)}</a>);
  }
  const tooltip = (
    <Tooltip id="tooltip">
      {instance.why_owner}
    </Tooltip>
  );
  return (
    <tr>
      <td>{instance.name}</td>
      <td>{instance.type}</td>
      <td>{instance.recommend}</td>
      <td>{formatMoneyAnnual(instance.waste)}</td>
      <td>{formatMoneyAnnual(instance.cost)}</td>
      <td className="owner_td">
        {owner_el}
        <OverlayTrigger placement="left" overlay={tooltip} onMouseOver={() => Analytics.record({
          name: 'tooltip',
          attributes: {
              target: 'attribution',
              targetUser: owner
          }
        })}>
          <i className="far fa-question-circle"></i>
        </OverlayTrigger>
      </td>
      <td>{vp_el}</td>
    </tr>
  )
};
Instance.propTypes = {
  timePeriod: PropTypes.string.isRequired,
  instance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    cost: PropTypes.number.isRequired,
    owners: PropTypes.arrayOf(PropTypes.string).isRequired,
    recommend: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    waste: PropTypes.number.isRequired,
    why_owner: PropTypes.string.isRequired
  }).isRequired
};
const Instances = ({instances, timePeriod}) => {
  const handleClick = () => {
    alert('instances');
  }
  const id_tooltip = (
    <Tooltip id="tooltip">
      Instance id.
    </Tooltip>
  );
  const type_tooltip = (
    <Tooltip id="tooltip">
    Instance type.
    </Tooltip>
  );
  const suggest_tooltip = (
    <Tooltip id="tooltip">
    Suggested type to rightsize to.
    </Tooltip>
  );
  const can_save_tooltip = (
    <Tooltip id="tooltip">
    Amount you can save annually from rightsizing this instance, extrapolated from the last ten days.
    </Tooltip>
  );
  const cost_tooltip = (
    <Tooltip id="tooltip">
    Anual cost of this instance extrapolated from the last ten days.
    </Tooltip>
  );
  const owner_tooltip = (
    <Tooltip id="tooltip">
    The individual this instance is attributed to.
    </Tooltip>
  );
  const vp_owner_tooltip = (
    <Tooltip id="tooltip">
    The vp of the individual this instance is attributed to.
    </Tooltip>
  );
  const onMouseOver = (target) => () => Analytics.record({
      name: 'tooltip',
      attributes: { target: target }
  });
  return (
    <div id="instances">
      <table>
        <thead>
          <tr>
            <OverlayTrigger placement="bottom" overlay={id_tooltip} onMouseOver={onMouseOver('id')}>
              <th>id</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={type_tooltip} onMouseOver={onMouseOver('type')}>
            <th>Type</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={suggest_tooltip} onMouseOver={onMouseOver('suggest')}>
            <th>Suggest Type</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={can_save_tooltip} onMouseOver={onMouseOver('waste')}>
            <th>Can Save</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={cost_tooltip} onMouseOver={onMouseOver('cost')}>
            <th>Cost</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={owner_tooltip} onMouseOver={onMouseOver('owner')}>
            <th>Owner</th>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={vp_owner_tooltip} onMouseOver={onMouseOver('vpOwner')}>
            <th>Owner VP</th>
            </OverlayTrigger>
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => <Instance key={i.name} instance={i} timePeriod={timePeriod} />)}
        </tbody>
      </table>
    </div>
  );
}
Instances.propTypes = {
  timePeriod: PropTypes.string.isRequired,
  instances: PropTypes.array.isRequired
};

export default Instances;

