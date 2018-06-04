/* eslint-disable */
import { configure, shallow, mount, render } from 'enzyme';
import 'jest-localstorage-mock';
import fetch from 'node-fetch';
import Adapter from 'enzyme-adapter-react-16';
configure({ adapter: new Adapter() });

global.fetch = fetch;
global.shallow = shallow;
global.mount = mount;
global.render = render;
