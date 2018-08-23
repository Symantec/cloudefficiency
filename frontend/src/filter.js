import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { available_options } from './util';

let global_filter_id = 0;

class Filter extends React.Component {
  constructor(props) {
    super(props);
    this.id = global_filter_id++;
    let checked = {};
    props.options.forEach(name => checked[name] = false);
    this.state = {
      selected_options: [],
      should_display_list: false,
      can_open: props.options.length > 0,
      should_reverse: false,
      checked: checked
    };
  }
  handleButton(e) {
    if (!this.props.enabled) {
      return;
    }
    this.setState(prevState => {
      return {
        should_display_list: this.props.options.length > 0 && !this.state.should_display_list
      }
    }, () => {
      if (!this.state.should_display_list) {
        this.props.onChange(this.state.checked);
      }
    });
    e.stopPropagation();
  }
  handleCheck(e, name) {
    this.setState(prevState => {
      let checked = Object.assign({}, prevState.checked);
      checked[name] = !checked[name];
      return { 'checked': checked };
    });
    e.stopPropagation();
  }
  handleToggleSort(e) {
    this.setState(prevState => ({ 'should_reverse': !prevState.should_reverse }));
    e.stopPropagation();
  }
  render() {
    let sort_class = this.state.should_reverse ? "fa-sort-amount-up" : "fa-sort-amount-down";
    let options = this.props.options.slice();
    let sorted_options = this.state.should_reverse ? options.reverse() : options;
    return (<React.Fragment>
      {this.state.should_display_list && <ul className="filter-options">
        <i className={`fas ${sort_class} toggle-sort`} onClick={e => this.handleToggleSort(e)}></i>
        {sorted_options.map(name => {
          let id=`filter-${this.id}-checkbox-${name}`;
          return (
            <li key={name} className="filter-option">
              <input
                ref={name}
                type="checkbox"
                id={id}
                checked={this.state.checked[name]}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => this.handleCheck(e, name)}/>
              <label htmlFor={id}>{name}</label>
            </li>
          );
        })}
      </ul>}
      <i tabIndex="0" className="fas fa-filter button" onClick={(e) => this.handleButton(e)} disabled={!this.props.enabled}></i>
    </React.Fragment>);
  }
}

Filter.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  enabled: PropTypes.bool.isRequired
}

export default Filter;
