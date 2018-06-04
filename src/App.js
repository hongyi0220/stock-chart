import React from 'react';
import {
  withRouter,
  Route,
  Switch,
} from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Home,
  StockChart,
} from './components';

class App extends React.Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func,
      location: PropTypes.shape({
        pathname: PropTypes.string
      })
    }),
  };
  state = {
    isSidebarOn: false,
  };

  openSidebar = e => {
    e.stopPropagation();
    this.setState({ isSidebarOn: true });
  }

  closeSidebar = () => {
    this.setState({ isSidebarOn: false });
  }

  render() {
    return (
      <div onClick={this.closeSidebar} className='app-container'>
        <Switch>
          <Route exact path='/' render={props => <Home {...props} openSidebar={this.openSidebar} isSidebarOn={this.state.isSidebarOn} />} />
          <Route exact path='/chart' component={StockChart} />
        </Switch>
      </div>
    );
  }
}

export default withRouter(App);
export {

};
