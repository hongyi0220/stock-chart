/* eslint-disable */
import React from 'react';
import Sidebar from '../components/Sidebar';

test('Sidebar should render', () => {
  const wrapper = shallow(<Sidebar isSidebarOn={false} />);
  expect(wrapper).toMatchSnapshot();
});
