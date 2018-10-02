import React from 'react';
import { mount } from 'enzyme';
import GroupTool from './group_tool';

const expect_option_list = (wrapper, list) =>
  expect(wrapper.find('GroupOptions li').map(n => n.text())).toEqual(list);
const expect_option_list_closed = (wrapper) =>
  expect(wrapper.find('GroupOptions').length).toEqual(0);
const expect_place_holder = (wrapper, has_placeholder) => 
  expect(wrapper.find('PlaceHolder').length).toBe(has_placeholder ? 1 : 0);
const expect_selected_groups = (wrapper, selected) =>
  expect(wrapper.find('Grouping').map(g => g.prop('name'))).toEqual(selected);
const expect_button_disabled = (wrapper, is_disabled) =>
  expect(wrapper.find('.group-tool-button').getElement().props.disabled).toBe(is_disabled);
const click_button = (wrapper) =>
  wrapper.find('.group-tool-button').simulate('click');
const click_option = (wrapper, i) =>
  wrapper.find('GroupOptions li').at(i).simulate('click');
const remove_item = (wrapper, i) =>
  wrapper.find('Grouping .close-button').at(i).simulate('click');

test('<GroupTool /> Does nothing when disabled', () => {
  const give_options = ['first', 'second', 'third', 'second'];
  let options = ['first', 'second', 'third'];
  let selected = [];
  const callback = jest.fn();
  const wrapper = mount(<GroupTool enabled={false} candidate_groups={give_options} onChange={callback} />);

  click_button(wrapper);
  expect_option_list(wrapper, []);
});

test('<GroupTool /> Allows user to select ordered subset of given grouping options', () => {
  const give_options = ['first', 'second', 'third', 'second'];
  let options = ['first', 'second', 'third'];
  let selected = [];
  const callback = jest.fn();
  const wrapper = mount(<GroupTool enabled={true} candidate_groups={give_options} onChange={callback} />);


  // initial render
  expect(wrapper.find('.group-tool-button').length).toBe(1);
  expect_place_holder(wrapper, true);
  expect_selected_groups(wrapper, []);
  expect_option_list_closed(wrapper);

  // clicking the button opens a list of unselected group options without duplicates
  click_button(wrapper);
  expect_option_list(wrapper, options);

  // When first grouping selected:
  //  placeholder text no longer shows
  //  the correct item is displayed in the group tool
  //  leaves grouping list open with item removed
  //  calls callback with correctly ordered items
  selected.push(options[1]);
  options.splice(1, 1);

  click_option(wrapper, 1);
  expect_place_holder(wrapper, false);
  expect_selected_groups(wrapper, selected);
  expect_option_list(wrapper, options);
  expect(callback.mock.calls.length).toBe(1);
  expect(callback.mock.calls[0][0]).toEqual(selected);

  // clicking outside the option window closes it
  // TBD: this just relies on onclickoutside package

  // clicking the button with an open option window closes the option window
  click_button(wrapper);
  expect_option_list_closed(wrapper);
  expect_selected_groups(wrapper, selected);

  // reopen and select next option
  selected.push(options[1]);
  options.splice(1, 1);
  click_button(wrapper);
  click_option(wrapper, 1);
  expect_place_holder(wrapper, false);
  expect_selected_groups(wrapper, selected);
  expect_option_list(wrapper, options);
  expect(callback.mock.calls.length).toBe(2);
  expect(callback.mock.calls[1][0]).toEqual(selected);

  // X first item
  options.push(selected[0]);
  selected.splice(0, 1);

  remove_item(wrapper, 0);
  expect_selected_groups(wrapper, selected);
  expect_option_list(wrapper, options);
  expect(callback.mock.calls.length).toBe(3);
  expect(callback.mock.calls[2][0]).toEqual(selected);

  // put first item back
  selected.push(options[0]);
  options.splice(0, 1);

  click_option(wrapper, 0);
  expect_selected_groups(wrapper, selected);
  expect_option_list(wrapper, options);
  expect(callback.mock.calls.length).toBe(4);
  expect(callback.mock.calls[3][0]).toEqual(selected);

  // select final option
  selected.push(options[0]);
  options = [];

  click_option(wrapper, 0);
  // button is disabled and list is closed

  expect_button_disabled(wrapper, true);
  expect_place_holder(wrapper, false);
  expect_selected_groups(wrapper, selected);
  expect_option_list_closed(wrapper);
  expect(callback.mock.calls.length).toBe(5);
  expect(callback.mock.calls[4][0]).toEqual(selected);

  // X last item
  options.push(selected[1]);
  selected.splice(1, 1);

  remove_item(wrapper, 1);
  expect_button_disabled(wrapper, false);
  expect_selected_groups(wrapper, selected);
  expect_option_list_closed(wrapper);
  expect(callback.mock.calls.length).toBe(6);
  expect(callback.mock.calls[5][0]).toEqual(selected);


  click_button(wrapper);
  expect_option_list(wrapper, options);

});

