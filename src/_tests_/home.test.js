import React from 'react';
import Home from '../components/Home';
import Adapter from 'enzyme-adapter-react-16';
import Enzyme, { shallow, render, mount } from 'enzyme';

Enzyme.configure({ adapter: new Adapter() });

test('Home renders', () => {
  const wrapper = mount(<Home isSidebarOn={false} />);

  expect(wrapper).toMatchSnapshot();
});
