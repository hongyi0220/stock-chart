import React from 'react';
import { withRouter, Route, Switch } from 'react-router-dom';

class App extends React.Component {
    constructor() {
        super();
    }

    render() {
        return (
            <div>Welcome to Stock Chart</div>
        );
    }
}

export default withRouter(App);
