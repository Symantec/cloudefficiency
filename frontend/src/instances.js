import PropTypes from 'prop-types';
import React, { Component } from 'react';

const Instance = ({instance}) => {
  return (
    <li>{instance.name}</li>
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
    <ol id="instances">
      {instances.map((i) => <Instance key={i.name} instance={i} />)}
    </ol>
  );
}
Instances.propTypes = {
  instances: PropTypes.array.isRequired
};

export default Instances;

