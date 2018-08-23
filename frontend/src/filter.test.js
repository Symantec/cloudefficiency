import React from 'react';
import { mount } from 'enzyme';
import Filter from './filter';

const expect_option_list = (wrapper, list) =>
  expect(wrapper.find('Filter li').map(n => n.text())).toEqual(list);
const expect_option_list_closed = (wrapper) =>
  expect(wrapper.find('Filter ul').length).toEqual(0);
const click_options = (wrapper, options) =>
  options.forEach(i => wrapper.find('Filter li input').at(i).simulate('change', { currentTarget: { checked: true } }));
const click_button = (wrapper) =>
  wrapper.find('Filter .button').simulate('click');
const toggle_sort = (wrapper) =>
  wrapper.find('Filter .toggle-sort').simulate('click');

test('<Filter /> does nothing when disabled', () => {

  const callback = jest.fn();
  let options = ['first', 'second', 'third'];

  const wrapper = mount(<Filter enabled={false} options={options} onChange={callback} />);

  expect_option_list_closed(wrapper);
  click_button(wrapper);
  expect_option_list_closed(wrapper);
});

test('<Filter /> Allows user to select subset of given filter options', () => {
  /*
   * Calls callback when chosen options change.
   */
  const callback = jest.fn();
  let options = ['first', 'second', 'third'];

  const wrapper = mount(<Filter enabled={true} options={options} onChange={callback} />);

  expect_option_list_closed(wrapper);

  click_button(wrapper);
  expect(wrapper.find('Filter .toggle-sort').length).toEqual(1);
  expect_option_list(wrapper, options);

  click_options(wrapper, [1, 2]);
  expect(callback.mock.calls.length).toBe(0);

  // Changes don't apply until the tool is closed.
  click_button(wrapper);
  expect_option_list_closed(wrapper);
  expect(callback.mock.calls.length).toBe(1);
  expect(callback.mock.calls[0][0]).toEqual({
    'first': false,
    'second': true,
    'third': true,
  });


  click_button(wrapper)
  expect_option_list(wrapper, options);

  expect(wrapper.find('.toggle-sort').hasClass('fa-sort-amount-down')).toBe(true);
  expect(wrapper.find('.toggle-sort').hasClass('fa-sort-amount-up')).toBe(false);

  toggle_sort(wrapper);
  expect(wrapper.find('.toggle-sort').hasClass('fa-sort-amount-down')).toBe(false);
  expect(wrapper.find('.toggle-sort').hasClass('fa-sort-amount-up')).toBe(true);
  expect_option_list(wrapper, ['third', 'second', 'first']);

});
