import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Analytics } from 'aws-amplify';

const formatName = (s) => {
  return s.replace('_', ' ').replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const formatAnnulMoneyNumber = (ten_day_money) => {
  return Math.round((365/10) * ten_day_money).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatMoneyAnnual = (ten_day_money) => {
  let formatted = formatAnnulMoneyNumber(ten_day_money);
  return (<span className="money">{formatted}</span>);
};

const formatMoneyAnnualIcon = (ten_day_money, instance_count) => {
  let formatted = formatAnnulMoneyNumber(ten_day_money);
  let el;
  if (ten_day_money == 0) {
    if (instance_count == 0) {
      el = (<span className="money good">{formatted}</span>);
    } else {
      el = (<span><span className="money good">{formatted}</span> <i className="far fa-smile"></i></span>);
    }
  } else {
    el = (<span className="money">{formatted}</span>);
  }
  const tooltip = (
    <Tooltip id="tooltip">
    instance count: {instance_count}
    </Tooltip>
  );
  return (<OverlayTrigger placement="right" overlay={tooltip} onMouseOver={() => Analytics.record({
          name: 'tooltip',
          attributes: { target: 'moneyExplanation' }
        })}>
    {el}
  </OverlayTrigger>);
};

export { formatMoneyAnnual, formatMoneyAnnualIcon, formatName };
