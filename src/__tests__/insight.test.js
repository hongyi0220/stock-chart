/* eslint-disable */
import React from 'react';
import Insight from '../components/Insight';

test('Insight should render', () => {
  const wrapper = shallow(<Insight />);
  expect(wrapper).toMatchSnapshot();
});
