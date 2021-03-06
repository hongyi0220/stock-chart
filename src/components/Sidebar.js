import React from 'react';
import PropTypes from 'prop-types';
import {
  Sidebar as SideMenu,
} from 'semantic-ui-react';

const Sidebar = ({ isSidebarOn }) => {
  return (
    <SideMenu animation='overlay' visible={isSidebarOn} width='wide'>
      <div className='about-this-app-container'>
        <div className='about-text-wrapper'>About This App</div>

        <div className='tech-text-wrapper'>Front-end tech stack</div>
        <div className='front-end logos-container'>
          <div className='react logo-container'>
            <img src='/img/logos/react-logo.png'/>
            <div className='logo-text-wrapper'>React.js</div>
          </div>
          <div className='semantic logo-container'>
            <img src='/img/logos/semantic-ui-logo.png'/>
            <div className='logo-text-wrapper'>Semantic-UI-React</div>
          </div>
        </div>

        <div className='tech-text-wrapper'>Back-end tech stack</div>
        <div className='back-end logos-container'>
          <div className='nodejs logo-container'>
            <img src='/img/logos/nodejs-logo2.png'/>
            <div className='logo-text-wrapper'>Node.js</div>
          </div>
          <div className='express logo-container'>
            <img src='/img/logos/expressjs-logo2.png'/>
            <div className='logo-text-wrapper'>Express.js</div>
          </div>
          <div className='mongodb logo-container'>
            <img src='/img/logos/mongodb-logo.png'/>
            <div className='logo-text-wrapper'>MongoDB</div>
          </div>
        </div>

        <div className='tech-text-wrapper'>API</div>
        <div className='api logos-container'>
          <div className='quandl logo-container'>
            <img src='/img/logos/quandl-logo.png'/>
            <div className='logo-text-wrapper'>Quandl</div>
          </div>
        </div>

        <div className='tech-text-wrapper'>Key modules</div>
        <div className='modules logos-container'>
          <div className='socketio logo-container'>
            <img src='/img/logos/socketio-logo.gif'/>
            <div className='logo-text-wrapper'>Socket.io</div>
          </div>
          <div className='highcharts logo-container'>
            <img src='/img/logos/highcharts-logo.png'/>
            <div className='logo-text-wrapper'>Highcharts</div>
          </div>
        </div>

        <div>Logo made with
          <a href="https://www.designevo.com/" title="Free Online Logo Maker">DesignEvo</a>
        </div>
      </div>
    </SideMenu>
  );
};

Sidebar.propTypes = {
  isSidebarOn: PropTypes.bool.isRequired,
};
export default Sidebar;
