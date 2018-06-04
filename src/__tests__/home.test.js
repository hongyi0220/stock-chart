/* eslint-disable */
import React from 'react';
import Home from '../components/Home';
import { createMemoryHistory } from 'history'

describe('<Home />', () => {
  test('renders', () => {
    let history = createMemoryHistory('/');
    let wrapper = render(<Home isSidebarOn={false} history={history}/>);

    expect(wrapper).toMatchSnapshot();
  });
});
