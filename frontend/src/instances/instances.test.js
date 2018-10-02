
import React from 'react';
import { mount } from 'enzyme';
import GroupTool from './group_tool';


test('<Instances /> is untested', () => {
});
/*
# grouping is on
  - allways show all possible headers for given instances in grouptool
  - columns should correspond to selected groupings, as well as a count, cost, and can save
  - rows should be summaries for each existing combinations of values of the given headers, possibly filtered
  - filter options should only reflect the currently shown combinations

# grouping is off
  - allways show all possible headers for given instances in options
  - columns should correspond to selected headers
  - rows should be instances, possible filtered by filters
  - filter options should only reflect the currently shown combinations


outer table has headers
  headers have name, tooltip, filter

  need filter values for each header
  has to come from table

inner table is either
  instances

or
  summaries

*/
