import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Analytics } from 'aws-amplify';

const formatName = (s) => {
  return s.replace('_', ' ').replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const formatAnnualMoneyNumber = (ten_day_money) => {
  return Math.round((365/10) * ten_day_money).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatMoneyAnnual = (ten_day_money, more_classNames) => {
  let formatted = formatAnnualMoneyNumber(ten_day_money);
  return formatted;
};

const formatMoneyAnnualIcon = (ten_day_money, instance_count, is_big) => {
  let className = "money";
  let icon = false;
  if (ten_day_money == 0) {
    className += " good";
    if (instance_count > 0) {
      icon = true;
    }
  } else {
    className += " bad";
  }
  if (is_big) {
    className += " money-big";
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
    <span>
      <span className={className}>{formatAnnualMoneyNumber(ten_day_money)}</span>
      {icon && <i className="far fa-smile"></i>}
    </span>
  </OverlayTrigger>);
};

export { formatMoneyAnnual, formatMoneyAnnualIcon, formatName };
