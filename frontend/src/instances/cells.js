/**
 * This file contains various cell renderers for React-Table
 */

import React from 'react';
import { formatMoneyAnnual, formatName } from '../formats';
import { Button, Modal, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Filter from '../filter'
import Analytics from '../analytics';
import _ from 'lodash';

/**
 * Render a react-table cell with a generic money value.
 */
const renderMoneyCell = props => {
  let { value } = props;
  return (<span className="money">{formatMoneyAnnual(value)}</span>);
}

/**
 * Render a react-table cell with a money value, including a judgement class.
 * If the value is greater than 0, it is bad, otherwise it is good.
 */
const renderJudgedMoneyCell = props => {
  let { value } = props;
  return (<span className={value === 0 ? 'money good' : 'money bad'}>{formatMoneyAnnual(value)}</span>);
}

/**
 * Render a react-table cell as a link to an indiviaual.
 */
const renderPersonCell = props => {
  const timePeriod = props.tdProps.rest.timePeriod;
  const name = props.value;
  if (!name) {
    return (<span>None</span>);
  }
  // TODO: extract urls
  let url = `/${timePeriod}/allocation/${name}.html`;
  let vp_el = <a href={url} onClick={() => Analytics.record({
    name: 'click',
    attributes: {
        target: 'ownerVP',
        targetUser: name,
        targetInstance: 'id'
    },
  })}>{formatName(name)}</a>
  return (<span className="owner-link">{vp_el}</span>);
}

const renderOwnerCell = props => {
  const timePeriod = props.tdProps.rest.timePeriod;
  const name = props.value;
  const { aggregated } = props;

  if (!name) {
    return (<span>None</span>);
  }
  // TODO: extract urls
  let url = `/${timePeriod}/allocation/${name}.html`;
  const tooltip = aggregated || (
    <Tooltip id="tooltip">
      {props.original.why_owner || 'No attribution reason'}
    </Tooltip>
  );
  let owner_el = (<a href={url} onClick={() => Analytics.record({
    name: 'click',
    attributes: {
        target: 'instanceOwner',
        targetUser: name,
        targetInstance: 'id'
    },
  })}>{formatName(name)}</a>);
  return (<React.Fragment>
    { aggregated || <OverlayTrigger placement="left" overlay={tooltip} onMouseOver={() => Analytics.record({
      name: 'tooltip',
      attributes: {
          target: 'attribution',
          targetUser: name
      }
    })}>
      <i className="far fa-question-circle"></i>
    </OverlayTrigger> }
    <span className="owner-link">{owner_el}</span>
  </React.Fragment>);
}

function Header({name, tooltip, children}) {
  const onMouseOver = (target) => {
    return () => Analytics.record({
      name: 'tooltip',
      attributes: { target: target }
    });
  }
  const tooltip_el = (
    <Tooltip id={name}>
      {tooltip}
    </Tooltip>
  );
  return (<div>
    <OverlayTrigger placement="bottom" overlay={tooltip_el} onMouseOver={onMouseOver(name)}>
        <span>{name}</span>
    </OverlayTrigger>
    {children}
  </div>);
}
const renderHeader = props => {
  let { column, data } = props;
  let { id, has_filter, title, tooltip, is_loaded, handleFilter } = column;

  let options = [];
  if (has_filter) {
    let counts = _.countBy(data, c => c[column.id]);
    options = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }

  return (<Header name={title} tooltip={tooltip}>
                {has_filter && <Filter enabled={!!is_loaded} options={options} onChange={(checked) => handleFilter(id, checked)}/>}
              </Header>);
};


export {
  renderHeader,
  renderMoneyCell,
  renderJudgedMoneyCell,
  renderPersonCell,
  renderOwnerCell
}
