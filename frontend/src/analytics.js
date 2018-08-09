import Amplify from 'aws-amplify';
import { awsmobile } from './config';
import { Analytics } from 'aws-amplify';

const setup = () => Amplify.configure(awsmobile);

let background = {};

const defaultInfo = (info) => {
  background = info;
  Analytics.updateEndpoint(info);
}
const record = (event) => {
    let e = Object.assign({}, event);
    e.attributes = Object.assign(e.attributes || {}, background);
    console.log(e);
    Analytics.record(e);
};

export default {
  record,
  defaultInfo,
  setup
}
