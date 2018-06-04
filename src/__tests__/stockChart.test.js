/* eslint-disable */
import React from 'react';
import StockChart from '../components/StockChart';
import { createMemoryHistory } from 'history'

test('StockChart should render', () => {
  const history = createMemoryHistory('/chart');
  const wrapper = shallow(<StockChart history={history} />);

  expect(wrapper).toMatchSnapshot();
});
