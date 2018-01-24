import React from 'react';
import { withRouter, Route, Switch } from 'react-router-dom';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';
import { Button, Transition, Icon } from 'semantic-ui-react';

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
            cardSymbol: null
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
        this.registerCardSymbol = this.registerCardSymbol.bind(this);
    }

    getData(stockSymbol) {
        // console.log('stockSym arg @ getData:', stockSym);
        const api_key = '?api_key=mx7b4emwTWnteEaLCztY';
        const apiRoot = 'https://www.quandl.com/api/v3/datasets/WIKI/';
        const dataAPI = apiRoot + stockSymbol + '/data.json' + api_key;
        const metadataAPI = apiRoot + stockSymbol + '/metadata.json' + api_key;
        const state = {...this.state};

        fetch(metadataAPI)
        .then(res => res.json())
        .then(resJson => {
            const index = resJson.dataset.name.indexOf('(');
            const stockName = resJson.dataset.name.slice(0, index).trim();
            state.stockNames.push(stockName);
            this.setState({ state }, () => console.log('state after getting stockName:', this.state))
        })
        .catch(err => console.error(err));

        return fetch(dataAPI)
        .then(res => res.json())
        .then(resJson => {
            // console.log('resJson:', resJson);

            let stockData = state.stockData;

            if (resJson['quandl_error']) {
                throw new Error(resJson['quandl_error'].message);
            }
            const transformedData = transformData(resJson);

            stockData.push(transformedData)
            this.setState({state}/*, () => console.log('state after setState @ getData:', this.state)*/);
            return transformedData;
        })
        .catch(err => {
            console.log(err);
            return false;
        });

        function transformData(data) {
            data = data['dataset_data'].data.map(d => {
                const dateString = d[0];
                const date = Date.parse(dateString);
                const stockValue = d[4];
                return [date, stockValue];
            });
            // console.log('transformedData:', data);
            return data.reverse();
        }
    }

    handleInput(evt) {
        const input = evt.target.value;
        // console.log('input:', input);
        this.setState({
            input: input
        });
    }

    handleKeyDown(evt) {
        // console.log('evt.key', evt.key);
        const key = evt.key;
        if (key === 'Enter') this.handleSubmit();
    }

    handleSubmit() {
        const socket = socketIOClient();
        const state = {...this.state};
        const input = state.input;
        const stockNames = state.stockNames;
        console.log('stockNames @ handleSubmit:', stockNames);
        console.log('stockName @ handleSubmit:', stockName);
        const stockName = stockNames[stockNames.length];
        const symbol = input.trim().toUpperCase();
        // console.log('trimmed input(symbol):', symbol);
        const stockSymbols = state.stockSymbols;

        function hasSymbol(sym) {
            for (let i = 0; i < stockSymbols.length; i++) {
                if (stockSymbols[i] === sym) return true;
            }
            return false;
        }
        this.setState({ input: '' });
        if (!hasSymbol(symbol)) {
            this.getData(symbol)
            .then(stockDatum => {
                // console.log('result:', result);
                // console.log('!hasSymbol:', !hasSymbol(symbol));
                if (stockDatum) {
                    const packaged = this.packageData(symbol, stockDatum, stockName);
                    // state.package = package;
                    stockSymbols.push(symbol);
                    this.setState({ state }, () => {
                        socket.emit('stock symbols', this.state.stockSymbols);
                        socket.emit('stock data', this.state.stockData);
                        socket.emit('stock names', this.state.stockNames)
                        this.storeStockData(packaged);
                        // console.log('state after setState:', this.state);
                    });
                }
            })
            .catch(err => {
                console.log(err);
            });
        }
    }

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
                    text: 'Stock'
                },
                series: series
            });
        }

    }

    packageData(symbol, stockDatum, stockName) {
        const packaged = {
            stockSymbol: symbol,
            stockName: stockName,
            stockDatum: stockDatum
        }
        return packaged;
    }

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
                console.log('state after unpacking:', this.state)
            });
        }

    }

    storeStockData(packaged) {
        // const stockSymbols = state.stockSymbols;
        // const dataset = state.dataset;

        const apiUrl = 'http://localhost:8080/stock';
        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                packaged: packaged
                // stockSymbol: symbol,
                // dataset: dataset
            })
        }
        fetch(apiUrl, init)
        .catch(err => {
            console.error(err);
        });
    }

    getStockData() {
        console.log('getStockData triggered');
        const apiUrl = 'http://localhost:8080/getstock';
        return fetch(apiUrl)
        .then(res => res.json())
        // .then(resJson => this.setState({stockSymbols: resJson}))
        .then(resJson => {return resJson})
        .catch(err => {
            console.error(err);
        });
    }

    removeStock(evt) {
        const socket = socketIOClient();
        const symbol = evt.target.id;
        const queryString = '?symbol=' + symbol.toLowerCase();
        const apiUrl = 'http://localhost:8080/remove';
        // const testUrl = 'http://localhost:8080/remove/:symbol=fb';
        console.log('removeStock:', symbol);
        fetch(apiUrl + queryString)
        // fetch(testUrl)
        .catch(err => console.error(err));

        const state = {...this.state};
        let stockSymbols = state.stockSymbols;
        let stockData = state.stockData;
        const stockSymbolIndex = stockSymbols.indexOf(symbol);

        stockSymbols.splice(stockSymbolIndex, 1);
        stockData.splice(stockSymbolIndex, 1);
        stockNames.splice(stockSymbolIndex, 1);

        this.setState({ state }, () => {
            console.log('state after removeStock:', this.state);
            socket.emit('stock symbols', this.state.stockSymbols);
            socket.emit('stock data', this.state.stockData);
            socket.emit('stock names', this.state.stockNames);
        });
        this.buildChart(document.querySelector('.chart-container'))();
    }

    toggleIcon() {
        // console.log('toggledIcon');
        this.setState({
            icon: !this.state.icon
        });
    }

    registerCardSymbol(evt) {

        const cardSymbol = evt.target.id;
        // console.log('registering cardSymbol:', cardSymbol);
        this.setState({
            cardSymbol: cardSymbol
        });
    }

    componentDidMount() {
        // console.log('componentDidMount');
        const socket = socketIOClient();
        // console.log('socket:', socket);
        const chartContainer = document.querySelector('.chart-container');

        socket.on('stock symbols', symbols => this.setState({stockSymbols: symbols}));
        socket.on('stock names', names => this.setState({stockNames: names}));
        socket.on('stock data', stockData => {

            const stockSymbols = this.state.stockSymbols;
            this.setState({stockData: stockData});
            const build = this.buildChart(chartContainer);
            // Using inner function's closure over the argument chartContainer
            build(stockData, stockSymbols);
            // console.log('setState @ compDidMnt:', this.state);
        });

        const state = {...this.state};
        // console.log('{...this.state} @ compDidMnt:', state);
        const stockSymbols = state.stockSymbols;
        const stockData = state.stockData;

        // Code below ensures if user is reloading page or visiting the page for the first time,
        // previous searched stock info is retrieved and displayed
        if (localStorage) {
            // console.log('has localStorage');
            const visited = localStorage.getItem('visited');
            if (!visited) {
                // console.log('first time visit');
                localStorage.setItem('visited', 'true');
                // console.log('stockData, stockSymbols:', stockData, stockSymbols);
                this.getStockData()
                .then(packaged => {
                    const build = this.buildChart(chartContainer);
                    // console.log('does chartContainer exist inside the scope of a promise?:', chartContainer);
                    this.unpackData(packaged, build);
                })
                .catch(err => console.error(err));

            }
        }

        window.onbeforeunload = function() {
            localStorage.removeItem('visited');
        }

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
        const icon = this.state.icon;
        const registerCardSymbol = this.registerCardSymbol;
        const cardSymbol = this.state.cardSymbol;
        const stockNames = this.state.stockNames;
        const stockInfo = stockSymbols.map((sym,i) => [sym, stockNames[i]]);

        return (
            <div className='app-container'>
                <div className='chart-container'></div>
                <div className='cards-container'>
                    {stockInfo.map((si, i) => {
                        const sym = si[0];
                        const name = si[1];
                        return (<div className='transition-wrapper' onMouseEnter={registerCardSymbol} id={sym} key={i} >
                            <Transition animation='fade up' duration={800} transitionOnMount={true}>
                                <div className='card-wrapper'>
                                    <div className='stock-card' id={sym} onMouseEnter={toggleIcon} onMouseLeave={toggleIcon}>
                                        <div className='stock-symbol-wrapper'>{sym}</div>
                                        <div className='stock-name-wrapper'>{name}</div>
                                        {icon && (cardSymbol === sym) ? <Icon onClick={(evt) => {removeStock(evt); toggleIcon()}}
                                            id={sym} className='icon' color='grey' name='delete'></Icon> : ''}
                                    </div>
                                </div>
                            </Transition>
                        </div>)
                    })}
                </div>
                <div className='search-container'>
                    <div className='search-wrapper'>
                        <input onChange={handleInput} onKeyDown={handleKeyDown} type='text' placeholder='Enter a stock symbol..' value={value}/>
                        <Button className='button' basic color='grey' onClick={handleSubmit}>Add</Button>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(App);
