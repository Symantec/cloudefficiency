import PropTypes from 'prop-types';
import React, { Component } from 'react';
import VPLIST from './vpList';
import { formatMoney, formatName } from './formats';

let vps = {}

VPLIST.forEach((s) => vps[s] = true);

const Instance = ({instance}) => {
  let potentialVPs = instance.owners.filter((s) => s in vps);
  let vp = "None";
  let vp_el = (<span>{formatName(vp)}</span>);
  if (potentialVPs.length > 0) {
    vp = potentialVPs[0];
    let url = `/now/allocation/${vp}`;
    vp_el = <a href={url}>{formatName(vp)}</a>
  }
  return (
    <tr>
      <td>{instance.name}</td>
      <td>{instance.type}</td>
      <td>{instance.recommend}</td>
      <td className="money">{formatMoney(instance.waste)}</td>
      <td className="money">{formatMoney(instance.cost)}</td>
      <td>{vp_el}</td>
    </tr>
  )
};
Instance.propTypes = {
  instance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    cost: PropTypes.number.isRequired,
    owners: PropTypes.arrayOf(PropTypes.string).isRequired,
    recommend: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    waste: PropTypes.number.isRequired
  }).isRequired
};
const Instances = ({instances}) => {
  const handleClick = () => {
    alert('instances');
  }
  return (
    <div id="instances">
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>Type</th>
            <th>Suggest Type</th>
            <th>Can Save</th>
            <th>Cost</th>
            <th>Owner VP</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => <Instance key={i.name} instance={i} />)}
        </tbody>
      </table>
    </div>
  );
}
Instances.propTypes = {
  instances: PropTypes.array.isRequired
};

export default Instances;

