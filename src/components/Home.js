import React from 'react';
import PropTypes from 'prop-types';
import Sidebar from './Sidebar';

export default class Home extends React.Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func,
      location: PropTypes.shape({
        pathname: PropTypes.string
      })
    }),
    isSidebarOn: PropTypes.bool,
    toggleSidebar: PropTypes.func,
  };

  render() {
    return (
      <div className='home-page-container'>
        <div className='logo-wrapper'>
          <img onClick={() => {this.props.history.push('/');}} src='/img/logo2.png'/>
        </div>
        <div onClick={()=> {this.props.history.push('/chart');}} className='view-chart-container'>
          <img src='/img/line-chart2.png'/>
          <div className='view-chart-text-wrapper'>View Chart</div>
        </div>
        <Sidebar isSidebarOn={this.props.isSidebarOn}/>
        {!this.props.isSidebarOn && <div className='arrow' onClick={this.props.openSidebar}>></div>}{/* eslint-disable-line*/}
        <div className='footer'>
          <a className='footer-item' href='https://hongyi0220.github.io'>yung</a>
          <hr />
          <a className='footer-item' href='https://github.com/hongyi0220/stock-chart'>repo</a>
        </div>
      </div>
    );
  }
}
