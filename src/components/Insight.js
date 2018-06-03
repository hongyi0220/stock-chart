import React from 'react';
import {
  Transition,
  Icon,
  Card,
  Image,
} from 'semantic-ui-react';

const Insight = () => {
  return (
    <div className="stock-insight-card-wrapper">
      <Transition animation='fade down' duration={600} transitionOnMount={true}>
        <Card>
          <Image src='./img/company-logo-placeholder.jpg'/>
          <Card.Content>
            <Card.Header>ABC</Card.Header>
            <Card.Meta>
              <span className='date'>IPO date: 2015</span>
            </Card.Meta>
            <Card.Description>
              Week of 2018-03-29: <br />
              open: 90.6100<br />
              high: 95.1390<br />
              low: 88.4000<br />
              close: 91.2700<br />
              adjusted close: 90.8771<br />
              volume: 207104405<br />
              dividend amount: 0.0000
            </Card.Description>
          </Card.Content>
          <Card.Content extra>
            <a>
              <Icon name='chart line' />
              Bull
            </a>
          </Card.Content>
        </Card>
      </Transition>
    </div>
  );
};

export default Insight;
