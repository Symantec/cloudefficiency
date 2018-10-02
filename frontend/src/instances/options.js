/**
 * This file contains a component to show options for the instances panel.
 */
import attribute_headers from './attribute_headers';
import PropTypes from 'prop-types';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';

function ModalOption({name, checked, onChange}) {
  return (<li>
    <label>
      <input tabIndex="0" type="checkbox" checked={checked} onChange={onChange}/>
      {name}
    </label>
   </li>);
}

class Options extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.handleHide = this.handleHide.bind(this);

    this.state = {
      show: false,
    };
  }

  handleHide() {
    this.setState({ show: false });
  }
  render() {
    let { tagOptions, attributesOptions } = this.props;

    const toggle = (stateKey, innerKey) => {
      this.props[stateKey][innerKey] = !this.props[stateKey][innerKey];
      this.props.onChange(this.props.attributesOptions, this.props.tagOptions);
    }

    return (
      <div className="modal-container" style={{ height: 200 }}>
        <i tabIndex="0" className="fas fa-cog" onClick={() => this.setState({ show: true })}></i>
        <Modal
          show={this.state.show}
          onHide={this.handleHide}
          container={this}
          aria-labelledby="contained-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="contained-modal-title">
              Show/Hide Columns
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h3>Instance Tags</h3>
            <ul>
              {Object.keys(tagOptions).map(s => 
              <ModalOption key={s} name={s} checked={tagOptions[s]} onChange={() => toggle('tagOptions', s)} />)}
            </ul>
            <h3>Instance Attributes</h3>
            <ul>
              {Object.keys(attributesOptions).map(s => {
                let name = attribute_headers.find(h => h.id == s);
                if (name) {
                  name = name.title
                } else {
                  name = s;
                }

                return (<ModalOption key={s} name={name} checked={attributesOptions[s]} onChange={() => toggle('attributesOptions', s)} />);
              })}
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.handleHide}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>);
  }
}
Options.propTypes = {
  tagOptions: PropTypes.object.isRequired,
  attributesOptions: PropTypes.object.isRequired
};

export default Options;
