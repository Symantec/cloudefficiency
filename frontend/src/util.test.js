import { available_options } from './util';

describe('available_options', () => {
  test('returns all options if none are already selected', () => {
    expect(available_options([1, 2, 3], [])).toEqual([1, 2, 3]);
  });
  test('returns no options if all are already selected', () => {
    expect(available_options([1, 2, 3], [1, 2, 3])).toEqual([]);
  });
  test('returns some options if others are already selected', () => {
    expect(available_options([1, 2, 3], [1, 3])).toEqual([2]);
  });
  test('returns unique options', () => {
    expect(available_options([1, 2, 1, 3], [2])).toEqual([1, 3]);
  });
});
