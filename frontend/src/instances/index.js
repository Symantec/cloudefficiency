import attribute_headers from './attribute_headers';
import PropTypes from 'prop-types';
import React from 'react';
import ReactTable from "react-table";
import GroupTool from '../group_tool';
import Options from './options';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { renderHeader, } from './cells';
import Analytics from '../analytics';


/**
 * A complete instances panel:
 * -----------------------------
 * | group by       |  options |
 * | headers plus filters      |
 * | ... table body            |
 * -----------------------------
 * 
 */
class Instances extends React.Component {

  constructor(props) {
    super(props);

    let { instances, instanceHeaders, timePeriod, is_loaded } = props;
    let { tags } = instanceHeaders;

    let tagKeys = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
    let attributeKeys = attribute_headers.map(h => h.id).sort();

    // Initialize settings with tag and attribute options.
    let tagOptions = {};
    let attributesOptions = {};

    tagKeys.forEach(t => tagOptions[t] = false);
    attributeKeys.forEach(a => {
      let c = attribute_headers.find(c => c.id == a);
      if (c) {
        attributesOptions[a] = !!(c.default);
      } else {
        attributesOptions[a] = true
      }
    });

    this.state = {
      // group by selection
      selected_groups: [],

      // visible tags
      tagOptions: tagOptions,

      // visible instances attributes
      attributesOptions: attributesOptions,

      // applied filters
      // column -> selected values
      filter: {},

      // which rows have been expanded in group by
      // view. Follows react-table format.
      expanded: {}
    }
  }
  onMouseOver(target) {
    return () => Analytics.record({
      name: 'tooltip',
      attributes: { target: target }
    });
  }

  /**
   * Update state from user input to filter values.
   * checked_state is map from value to whether it's checked.
   */
  handleFilter(column_id, checked_state) {
    this.setState(state => {
      let checked = Object.keys(checked_state).filter(k => checked_state[k]);
      if (checked.length > 0) {
        state.filter[column_id] = checked;
      } else {
        delete state.filter[column_id];
      }
      return state;
    });
  }

  /**
   * Update state from user input to column display options.
   * both arguments are maps from potential column id to whether
   * it's selected to view.
   */
  handleOptions(attributesOptions, tagOptions) {
    this.setState({
      'tagOptions': tagOptions,
      'attributesOptions': attributesOptions
    });
  }

  /**
   * Update state from user input to group tool.
   * selected groups is a list of column ids.
   */
  handleGroupTool(selected_groups) {
    this.setState(state => ({'selected_groups': selected_groups}));
  }

  render() {
    let { instances, instanceHeaders, timePeriod, is_loaded } = this.props;
    let { tags } = instanceHeaders;

    let { tagOptions, attributesOptions } = this.state

    const potential_attribute_columns = attribute_headers;

    const potential_tag_columns = Object.keys(tags).map(k => {
      let title = k.replace(/(^tag_aws:|^tag_user_)/g, '');
      return {
        Header: renderHeader,
        has_filter: true,
        title: title,
        tooltip: `Instance tag ${title}, technically ${k}.`,
        id: k,
        accessor: i => {
          let t = i.tags.find(t => t.vendorKey == k);
          return t && t.vendorValue;
        },
        count: tags[k]
      };
    });

    let columns = [];

    // populate actual columns with selected columns.
    potential_attribute_columns.forEach(c => {
      if (this.state.attributesOptions[c.id]) {
        columns.push(c);
      }
    })
    potential_tag_columns.forEach(c => {
      if (this.state.tagOptions[c.id]) {
        columns.push(c);
      }
    })
    columns.forEach(c => {
        c.is_loaded = is_loaded;
        c.handleFilter = this.handleFilter.bind(this);
        c.minWidth = 80 + (c.title.length * 8) + (c.has_filter ? 16 : 0);
        if (c.has_filter) {
          c.filterable = true;
          c.filterMethod = (filter, row) => {
            return row[filter.id] in filter.value;
          };
        }
    });

    let groupOptions = columns.filter(c => !c.aggregate)

    // Only let the user expand all but the last
    // group by column.
    let expandableDepth = 0;
    let inGroupByState = this.state.selected_groups.length > 0;
    if (inGroupByState) {
      columns = columns.filter(c => this.state.selected_groups.find(g => c.id == g) || c.aggregate);
      // count of non aggregate columns, minus one
      expandableDepth = columns.slice().filter(x => !x.aggregate).length - 1;
    }

    // transform filter state to react-table format.
    let filtered = Object.keys(this.state.filter).map(k => {
      let filter_lookup = {}
      this.state.filter[k].forEach(v => filter_lookup[v] = true);
      return {
        id: k,
        value: filter_lookup
      };
    });

    return (
      <div id="instances">
        <GroupTool
          enabled={this.props.is_loaded}
          onChange={l => this.handleGroupTool(l)}
          candidate_groups={groupOptions.map(c => c.id)}
          candidate_group_displays={groupOptions.map(c => c.title)} />
        <Options enabled={this.props.is_loaded} tagOptions={tagOptions} attributesOptions={attributesOptions} onChange={(a, t) => this.handleOptions(a, t)}/>
        <ReactTable
          pivotBy={this.state.selected_groups}
          expanded={this.state.expanded}
          filtered={filtered}
          getTdProps={() => ({timePeriod: timePeriod})}
          onExpandedChange={(n, i, e) => {
            // Return an object nested only to specified depth.
            // Will not copy objects past given amount of nesting.
            const clearDepth = (o, n) => {
              if (o === false) {
                return false;
              }
              if (n <= 0) {
                return {};
              }
              let newO = {};
              Object.keys(o).forEach(k => {
                newO[k] = clearDepth(o[k], n - 1);
              });
              return newO;
            };
            this.setState({expanded: clearDepth(n, expandableDepth)});
          }}
          data={instances}
          columns={columns}
        />
      </div>
    );
  }
}
Instances.propTypes = {
  timePeriod: PropTypes.string.isRequired,
  instances: PropTypes.array.isRequired,
  instanceHeaders: PropTypes.shape({
    // tag => cardinatilty
    tags: PropTypes.object.isRequired
  }).isRequired,
  is_loaded: PropTypes.bool.isRequired
};

export { Instances };
