import {
  renderHeader,
  renderMoneyCell,
  renderJudgedMoneyCell,
  renderPersonCell,
  renderOwnerCell
} from './cells';
import { VPLIST } from '../config';
import _ from 'lodash';

/**
 * Indicates whether an individual is a vp.
 */
let vps = {};
VPLIST.forEach((s) => vps[s] = true);


/**
 * Initial column values for non-tag instances attributes.
 */
const attribute_headers = [{
  Header: renderHeader,
  tooltip: "The individual this instance is attributed to.",
  has_filter: true,
  title: 'Owner',
  id: 'owner',
  default: true,
  accessor: i => i.owners[0],
  Cell: renderOwnerCell
}, {
  Header: renderHeader,
  tooltip: "The vp of the individual this instance is attributed to.",
  has_filter: true,
  title: 'VP Owner',
  id: 'vpowner',
  default: true,
  accessor: i => i.owners.find(s => s in vps),
  Cell: renderPersonCell
}, {
  Header: renderHeader,
  title: 'ID',
  tooltip: "Instance id.",
  accessor: 'name',
  id: 'name'
}, {
  Header: renderHeader,
  tooltip: "Instance type.",
  has_filter: true,
  title: 'Type',
  accessor: 'type',
  default: true,
  id: 'type'
}, {
  Header: renderHeader,
  has_filter: true,
  title: 'Suggest Type',
  tooltip: "Suggested type to rightsize to.",
  accessor: 'recommend',
  default: true,
  id: 'recommend',
}, {
  Header: renderHeader,
  tooltip: "Instance's Account.",
  has_filter: true,
  title: 'Account',
  accessor: 'account',
  id: 'account'
}, {
  Header: renderHeader,
  tooltip: "Instance's Region.",
  has_filter: true,
  title: 'Region',
  accessor: 'region',
  id: 'region'
}, {
  Header: renderHeader,
  tooltip: "Instance tenancy.",
  has_filter: true,
  title: 'Tenancy',
  accessor: 'tenancy',
  id: 'tenancy'
}, {
  Header: renderHeader,
  tooltip: "Percent of time instance was idle.",
  title: 'Idle Percent',
  accessor: 'idle',
  id: 'idle'
}, {
  Header: renderHeader,
  tooltip: "Numbers of hours running in the ten day period.",
  title: 'Hours Running',
  accessor: 'hoursRunning',
  id: 'hoursRunning'
}, {
  Header: renderHeader,
  tooltip: "Maximum cpu utilization over ten day period.",
  title: 'CPU Max',
  accessor: 'cpuMax',
  id: 'cpuMax'
}, {
  Header: renderHeader,
  title: 'Cost',
  tooltip: "Anual cost of this instance extrapolated from the last ten days.",
  accessor: 'cost',
  default: true,
  id: 'cost',
  aggregate: vals => _.sum(vals),
  Cell: renderMoneyCell
}, {
  Header: renderHeader,
  tooltip: "Hourly cost to run instance.",
  title: 'Hourly Cost',
  accessor: 'hourly',
  id: 'hourly',
  default: true,
  aggregate: vals => _.sum(vals),
  Cell: renderMoneyCell
}, {
  Header: renderHeader,
  title: 'Can Save',
  tooltip: "Amount you can save annually from rightsizing this instance, extrapolated from the last ten days.",
  accessor: 'waste',
  default: true,
  id: 'waste',
  aggregate: vals => _.sum(vals),
  Cell: renderJudgedMoneyCell
}];
export default attribute_headers;
