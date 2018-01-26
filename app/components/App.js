import React from 'react';
import { withRouter } from 'react-router-dom';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';
import { Transition, Icon, Sidebar } from 'semantic-ui-react';
import { theme } from './theme';

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            input: '',
            stockData: [],
            stockSymbols: [],
            stockNames: [],
            packaged: null,
            cardColor: 'green',
            icon: false,
            cardSymbol: null,
            cardsFull: false,
            error: null,
            sidebar: false,
            browserLocation: '/'
        }
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.buildChart = this.buildChart.bind(this);
        this.storeStockData = this.storeStockData.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.packageData = this.packageData.bind(this);
        this.unpackData = this.unpackData.bind(this);
        this.removeStock = this.removeStock.bind(this);
        this.toggleIcon = this.toggleIcon.bind(this);
        this.toggleIconOff = this.toggleIconOff.bind(this);
        this.registerCardSymbol = this.registerCardSymbol.bind(this);
        this.deregisterCardSymbol = this.deregisterCardSymbol.bind(this);
        this.getStockName = this.getStockName.bind(this);
        this.toggleSidebar = this.toggleSidebar.bind(this);
        this.setBrowserLocation = this.setBrowserLocation.bind(this);
    }

    // Get sotck metadata with Quandl API
    getStockName(stockSymbol) {
        const api_key = '?api_key=mx7b4emwTWnteEaLCztY';
        const apiRoot = 'https://www.quandl.com/api/v3/datasets/WIKI/';
        const metadataAPI = apiRoot + stockSymbol + '/metadata.json' + api_key;
        const state = {...this.state};

        return fetch(metadataAPI)
        .then(res => res.json())
        .then(resJson => {
            const index = resJson.dataset.name.indexOf('(');
            const stockName = resJson.dataset.name.slice(0, index).trim();
            const paddedStockName = addPadding(stockName, 25);
            console.log('paddedStockName, length', paddedStockName, paddedStockName.length);
            state.stockNames.push(paddedStockName);
            this.setState({ state });
            return paddedStockName;
        })
        .catch(err => console.error(err));

        function addPadding(text, maxLength) {
            let padding = '';
            if (text.length < maxLength) {
                for (let i = 0; i < maxLength - text.length; i++) {
                    padding += ' ';
                }
            }
            console.log('padding lenth', padding.length);
            return text + padding;
        }
    }

    // Get stock time-series data with Quandl API
    getData(stockSymbol) {
        const api_key = '?api_key=mx7b4emwTWnteEaLCztY';
        const apiRoot = 'https://www.quandl.com/api/v3/datasets/WIKI/';
        const dataAPI = apiRoot + stockSymbol + '/data.json' + api_key;
        const state = {...this.state};

        return fetch(dataAPI)
        .then(res => res.json())
        .then(resJson => {

            let stockData = state.stockData;

            if (resJson['quandl_error']) {
                throw new Error(resJson['quandl_error'].message);
            }
            const transformedData = transformData(resJson);

            stockData.push(transformedData);

            this.setState({stockData: stockData, error: false});
            return transformedData;
        })
        .catch(err => {
            console.error(err);
            this.setState({error: true});
            return false;
        });

        function transformData(data) {
            data = data['dataset_data'].data.map(d => {
                const dateString = d[0];
                const date = Date.parse(dateString);
                const stockValue = d[4];
                return [date, stockValue];
            });

            return data.reverse();
        }
    }
    // Store user input in this.state
    handleInput(evt) {
        const input = evt.target.value;

        this.setState({
            input: input
        });
    }
    // Detect keyboard enter key
    handleKeyDown(evt) {
        const key = evt.key;
        if (key === 'Enter') this.handleSubmit();
    }
    // If stock symbol isn't already displayed and API returns valid stock data
    //emit stock data to server using socket.io
    handleSubmit() {
        const socket = socketIOClient();
        const state = {...this.state};
        const input = state.input;
        const symbol = input.trim().toUpperCase();
        const stockSymbols = state.stockSymbols;

        function hasSymbol(sym) {
            for (let i = 0; i < stockSymbols.length; i++) {
                if (stockSymbols[i] === sym) return true;
            }
            return false;
        }

        const hasTen = stockSymbols.length > 9;
        this.setState({cardsFull: hasTen});

        this.setState({ input: '' });

        if (!hasSymbol(symbol) && !hasTen) {
            this.getData(symbol)
            .then(stockDatum => {

                if (stockDatum) {
                    var packaging = this.packageData(symbol, stockDatum);
                    stockSymbols.push(symbol);

                    this.getStockName(symbol)
                    .then(name => {
                        const packaged = packaging(name);
                        this.setState({ state }, () => {
                            socket.emit('stock symbols', this.state.stockSymbols);
                            socket.emit('stock names', this.state.stockNames);
                            socket.emit('stock data', this.state.stockData);
                            this.storeStockData(packaged);

                        });
                    })
                    .catch(err => console.error(err));
                }
            })
            .catch(err => console.log(err));
        }
    }
    // Build stock chart with Highcharts
    buildChart(where) {
        const defaultData = this.state.stockData;
        const defaultSymbols = this.state.stockSymbols;
        // A function that uses closure
        return function build(stockData = defaultData, stockSymbols = defaultSymbols) {
            let series = [];

            for (let i = 0; i < stockSymbols.length; i++) {
                const dataset = {
                    name: stockSymbols[i],
                    data: stockData[i],
                    tooltip: {
                        valueDecimals: 2
                    }
                };
                series.push(dataset);
            }

            const highcharts = new Highcharts.stockChart(where, {
                rangeSelector: {
                    selected: 1
                },
                title:  {
                    text: 'Stock Chart'
                },
                series: series
            });
        }

    }
    // Process stock time-series data, metadata and symbol before sending it to database
    packageData(symbol, stockDatum) {
        return function packaging(stockName) {
                    const pkg = {
                        stockSymbol: symbol,
                        stockName: stockName,
                        stockDatum: stockDatum
                    }
                    return pkg;
                }
    }
    // Process packaged data into 3 seperate data: stock symbols, names, and time-series data
    //so that the front-end code can use it to build stock chart
    unpackData(data, fn) {
        let stockSymbols = [];
        let stockData = [];
        let stockNames = [];
        data.forEach(datum => {
            stockSymbols.push(datum.stockSymbol);
            stockData.push(datum.stockDatum);
            stockNames.push(datum.stockName)
        });
        if (!stockSymbols.length) {
            const placeholderSymbol = ['EXMPL'];
            const placeholderData = [ [[1395878400000,388.46],[1395964800000,459.99],[1396224000000,556.97],[1396310400000,367.16],[1396396800000,567],[1396483200000,369.74],[1396569600000,443.14],[1396828800000,538.15],[1396915200000,554.9],[1397001600000,664.14]] ];
        if (fn) fn(placeholderData, placeholderSymbol);
        } else {
            this.setState({
                stockSymbols: stockSymbols,
                stockData: stockData,
                stockNames: stockNames
            }, () => {
                // This fn already has chartContainer passed-in as an argument
                if (fn) fn(stockData, stockSymbols);
            });
        }

    }
    // Send packaged stock data to server to be stored in database
    storeStockData(packaged) {

        const apiUrl = 'http://localhost:8080/stock';
        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                packaged: packaged
            })
        };
        fetch(apiUrl, init)
        .catch(err => {
            console.error(err);
        });
    }
    // Request to server to retrieve stock data in database
    getStockData() {
        const apiUrl = 'http://localhost:8080/getstock';
        return fetch(apiUrl)
        .then(res => res.json())
        .then(resJson => {return resJson})
        .catch(err => {
            console.error(err);
        });
    }
    // Remove a particular stock data from this.state and also request to remove it in database
    removeStock(evt) {
        const socket = socketIOClient();
        const symbol = evt.target.id;
        const queryString = '?symbol=' + symbol.toLowerCase();
        const apiUrl = 'http://localhost:8080/remove';

        fetch(apiUrl + queryString)
        .catch(err => console.error(err));

        const state = {...this.state};
        const stockSymbols = state.stockSymbols;
        const stockData = state.stockData;
        const stockNames = state.stockNames;
        const stockSymbolIndex = stockSymbols.indexOf(symbol);

        stockSymbols.splice(stockSymbolIndex, 1);
        stockData.splice(stockSymbolIndex, 1);
        stockNames.splice(stockSymbolIndex, 1);

        this.setState({ state }, () => {

            socket.emit('stock symbols', this.state.stockSymbols);
            socket.emit('stock names', this.state.stockNames);
            socket.emit('stock data', this.state.stockData);

        });
        this.buildChart(document.querySelector('.chart-container'))();
    }
    // Toggle remove(x)-icon
    toggleIcon() {
        this.setState({
            icon: true
        });
    }
    // Toggle remove(x)-icon off
    toggleIconOff() {
        this.setState({
            icon: false
        });
    }
    // Store stock symbol in state for indentifying which stock card is moused-over;
    //this enables some user interface effects only on that stock card
    registerCardSymbol(evt) {
        const cardSymbol = evt.target.id;

        this.setState({
            cardSymbol: cardSymbol
        });
    }
    // Opposite of the above
    deregisterCardSymbol(evt) {
        this.setState({
            cardSymbol: null
        });
    }
    // Toggle sidebar
    toggleSidebar() {
        this.setState({sidebar: !this.state.sidebar});
    }
    // Set browser history location in state also push to props.history so navigation is possible
    setBrowserLocation(location) {
        this.setState({browserLocation: location});
        this.props.history.push(location);
    }

    componentDidMount() {
        const socket = socketIOClient();
        const chartContainer = document.querySelector('.chart-container');
        // Listen for change
        socket.on('stock symbols', symbols => {
            this.setState({stockSymbols: symbols})
        });
        socket.on('stock names', names => {
            this.setState({stockNames: names})
        });
        socket.on('stock data', stockData => {

            const stockSymbols = this.state.stockSymbols;
            this.setState({stockData: stockData});
            const build = this.buildChart(chartContainer);
            // Using inner function's closure over the argument chartContainer
            build(stockData, stockSymbols);
        });

        const state = {...this.state};
        const stockSymbols = state.stockSymbols;
        const stockData = state.stockData;

        const pathname = this.props.history.location.pathname;

        this.setBrowserLocation(pathname);

        // Code below ensures if user is reloading page or visiting the page for the first time,
        // previous searched stock info is retrieved and displayed
        if (localStorage) {

            const visited = localStorage.getItem('visited');
            if (!visited) {

                localStorage.setItem('visited', 'true');

                this.getStockData()
                .then(packaged => {
                    const build = this.buildChart(chartContainer);

                    this.unpackData(packaged, build);
                })
                .catch(err => console.error(err));
            }
        }

        window.onbeforeunload = function() {
            localStorage.removeItem('visited');
        }
        Highcharts.theme = theme();
        Highcharts.setOptions(Highcharts.theme);
    }

    render() {
        const handleSubmit = this.handleSubmit;
        const handleInput = this.handleInput;
        const stockSymbols = this.state.stockSymbols;
        const handleKeyDown = this.handleKeyDown;
        const value = this.state.input;
        const removeStock = this.removeStock;
        const cardColor = this.state.cardColor;
        const changeCardColor = this.changeCardColor;
        const toggleIcon = this.toggleIcon;
        const toggleIconOff = this.toggleIconOff;
        const icon = this.state.icon;
        const registerCardSymbol = this.registerCardSymbol;
        const deregisterCardSymbol = this.deregisterCardSymbol;
        const cardSymbol = this.state.cardSymbol;
        const stockNames = this.state.stockNames;
        const stockInfo = stockSymbols.map((sym,i) => [sym, stockNames[i]]);
        const cardsFull = this.state.cardsFull;
        const error = this.state.error;
        const toggleSidebar = this.toggleSidebar;
        const visible = this.state.sidebar;
        const setBrowserLocation = this.setBrowserLocation;
        const browserLocation = this.state.browserLocation;
        // Below 8 lines of code enables browsing between pages type of behavior
        const atChart = browserLocation === '/chart' ? 'block' : 'none';
        const atHome = browserLocation === '/' ? 'visible' : 'hidden';
        const appStyle = {
            display: atChart
        };
        const glossStyle = {
            visibility: atHome
        };

        return (
            <div onClick={() => {if (visible) toggleSidebar()}} className='container-all'>
                <div className='logo-wrapper'>
                    <img onClick={() => {setBrowserLocation('/')}} src='/img/logo2.png'/>
                </div>
                {/* This is stock chart 'page' */}
                <div className='app-container' style={appStyle}>

                        <div className='chart-container'></div>
                        <div className='cards-container'>
                            {stockInfo.map((si, i) => {
                                const sym = si[0];
                                const name = si[1];
                                return (<div className='transition-wrapper' onMouseEnter={(evt) => {registerCardSymbol(evt); toggleIcon()}}
                                    onMouseLeave={(evt) => {deregisterCardSymbol(evt); toggleIconOff()}} id={sym} key={i} >
                                    <Transition animation='fade up' duration={300} transitionOnMount={true}>
                                        <div className='card-wrapper'>
                                            <div className='stock-card' id={sym} >
                                                <div className='stock-symbol-wrapper'>{sym}</div>
                                                <div className='stock-name-wrapper'>{name}</div>
                                                {icon && (cardSymbol === sym) ? <Icon onClick={removeStock} id={sym}
                                                    className='icon' color='grey' name='delete'></Icon> : ''}
                                            </div>
                                        </div>
                                    </Transition>
                                </div>)
                            })}
                        </div>

                        <div className='search-container'>
                            <div className='search-wrapper'>
                                <input onChange={handleInput} onKeyDown={handleKeyDown} type='text' placeholder='Enter a stock symbol..' value={value}/>
                                <div className='button' onClick={handleSubmit}>ADD</div>
                            </div>
                            <div className='cards-full-container'>
                                <div className='cards-full-msg-wrapper'>
                                    {cardsFull ? 'Maximum number of chartable stocks reached.' : ''}
                                </div>
                                <div className='error-msg-wrapper'>
                                    {error ? 'Provided stock code didn\'t yield any results.' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* This is 'homepage' */}
                    <div className='gloss' style={glossStyle}>
                        <div className='logo-wrapper'><img onClick={() => {setBrowserLocation('/')}} src='/img/logo2.png'/></div>
                        <div  className='view-chart-wrapper'>
                                <img onClick={()=> {setBrowserLocation('/chart')}} src='/img/line-chart2.png'/>
                                <div className='view-chart-text-wrapper'>View Chart</div>
                        </div>
                        <Sidebar animation='overlay' visible={visible} width='very wide'>
                            <div className='about-container'>
                                <div className='about-text-wrapper'>About This App</div>
                                <div className='tech-text-wrapper'>Front-end tech stack</div>
                                <div className='front-end-logos-container logos-container'>
                                    <div className='react-logo-wrapper logo-wrapper'>
                                        <img src='/img/logos/react-logo.png'/>
                                        <div className='logo-text-wrapper'>React</div>
                                    </div>
                                    <div className='semantic-ui-logo-wrapper logo-wrapper'>
                                        <img src='/img/logos/semantic-ui-logo.png'/>
                                        <div className='logo-text-wrapper'>Semantic-UI-React</div>
                                    </div>
                                </div>
                                <div className='tech-text-wrapper'>Back-end tech stack</div>
                                <div className='back-end-logos-container logos-container'>
                                    <div className='nodejs-logo-wrapper logo-wrapper'>
                                        <img src='/img/logos/nodejs-logo2.png'/>
                                        <div className='logo-text-wrapper'>Node.js</div>
                                    </div>
                                    <div className='logo-wrapper'>
                                        <img src='/img/logos/expressjs-logo2.png'/>
                                        <div className='logo-text-wrapper'>Express.js</div>
                                    </div>
                                    <div className='mongodb-logo-wrapper logo-wrapper'>
                                        <img src='/img/logos/mongodb-logo.png'/>
                                        <div className='logo-text-wrapper'>MongoDBv</div>
                                    </div>
                                </div>
                                <div className='tech-text-wrapper'>API</div>
                                <div className='api-logos-container logos-container'>
                                    <div className='logo-wrapper'>
                                        <img src='/img/logos/quandl-logo.png'/>
                                        <div className='logo-text-wrapper'>Quandl</div>
                                    </div>
                                </div>
                                <div className='tech-text-wrapper'>Key modules</div>
                                <div className='modules-logos-container logos-container'>
                                    <div className='logo-wrapper'>
                                        <img src='/img/logos/socketio-logo.gif'/>
                                        <div className='logo-text-wrapper'>Socket.io</div>
                                    </div>
                                    <div className='logo-wrapper'>
                                        <img src='/img/logos/highcharts-logo.png'/>
                                        <div className='logo-text-wrapper'>Highcharts</div>
                                    </div>
                                </div>
                            </div>
                        </Sidebar>
                        {!visible ? <div className='arrow' onClick={toggleSidebar}>></div> : ''}
                    </div>
            </div>
        );
    }
}

export default withRouter(App);
