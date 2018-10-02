import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { available_options } from './util';

const Grouping = ({name, handleClose}) => {
  return (
    <li className="group-tool-grouping">
      <span>{name}</span>
      <i tabIndex="0" className="fas fa-times-circle close-button" onClick={handleClose}></i>
    </li>
  );
}
Grouping.propTypes = {
  name: PropTypes.string.isRequired,
  handleClose: PropTypes.func.isRequired
}

const PlaceHolder = () => <div className="group-tool-placeholder">Group Instances...</div>;

// credit to https://stackoverflow.com/questions/32553158/detect-click-outside-react-component
class GroupOptions extends React.Component {
  constructor(props) {
    super(props);

    this.setWrapperRef = this.setWrapperRef.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  setWrapperRef(node) {
    this.wrapperRef = node;
  }

  handleClickOutside(event) {
    if (document.getElementsByClassName('group-tool')[0].contains(event.target)) {
      return;
    }
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.props.onClickOutside();
    }
  }
  render() {
    return <ul className="group-tool-options" ref={this.setWrapperRef}>
      {this.props.children}
    </ul>
  }
}
GroupOptions.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element).isRequired,
  onClickOutside: PropTypes.func.isRequired
};

class GroupTool extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selected_groups: [],
      should_display_list: false,
      can_open: available_options(props.candidate_groups, []).length > 0
    };
  }
  handleButton(state) {
    if (!(this.state.can_open && this.props.enabled)) {
      return;
    }
    if (typeof(state) === "boolean") {
      this.setState({
        should_display_list: state
      });
    } else {
      this.setState(prevState => ({
        should_display_list: !(prevState.should_display_list)
      }));
    }
  }
  _deltaGroups(delta_func) {
    this.setState(prevState => {
      let new_groups = delta_func(prevState.selected_groups);
      let update = {
        selected_groups: new_groups,
        can_open: true
      };
      if (available_options(this.props.candidate_groups, new_groups).length === 0) {
        update['can_open'] = false;
        update['should_display_list'] = false;
      }
      return update;
    }, () => {
      this.props.onChange(this.state.selected_groups);
    });
  }
  handleAddGroup(name) {
    this._deltaGroups(prev_groups => {
      if (!prev_groups.includes(name)) {
        return prev_groups.concat([name]);
      }
      return prev_groups;
    });
  }
  handleXGroup(name) {
    this._deltaGroups(prev_groups => {
      let groups = prev_groups.slice();
      let index = groups.indexOf(name);
      if (index > -1) {
        groups.splice(index, 1);
      }
      return groups;
    });
  }
  render() {
    let candidate_groups = this.props.candidate_groups;
    let display_names = this.props.candidate_group_displays || this.props.candidate_groups;
    let options = (
      <GroupOptions onClickOutside={() => this.handleButton(false)}>
        {available_options(this.props.candidate_groups, this.state.selected_groups)
           .map(n => <li key={n} onClick={(e) => this.handleAddGroup(n)}>{display_names[candidate_groups.indexOf(n)]}</li>)
        }
      </GroupOptions>
    );
    let buttonEnabled = this.props.enabled && this.state.can_open;
    return (
      <ul className="group-tool">
        { this.state.should_display_list && options }
        <i tabIndex="0" className="fas fa-plus group-tool-button" onClick={(e) => this.handleButton()} disabled={!buttonEnabled}></i>
        { this.state.selected_groups.length === 0 && <PlaceHolder /> }
        { this.state.selected_groups.map(n => <Grouping name={display_names[candidate_groups.indexOf(n)]} key={n} handleClose={(e) => this.handleXGroup(n, e)}/>) }
      </ul>
    );
  }
}
GroupTool.propTypes = {
  candidate_groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  candidate_group_displays: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  enabled: PropTypes.bool.isRequired
};

export default GroupTool;
