import React from 'react';
import { withRouter, Route, Switch } from 'react-router-dom';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';
import { Transition, Icon } from 'semantic-ui-react';
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
            error: null
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
    }

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
            this.setState({ state }/*, () => console.log('state after getting stockName:', this.state)*/);
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

    getData(stockSymbol) {

        const api_key = '?api_key=mx7b4emwTWnteEaLCztY';
        const apiRoot = 'https://www.quandl.com/api/v3/datasets/WIKI/';
        const dataAPI = apiRoot + stockSymbol + '/data.json' + api_key;
        // const metadataAPI = apiRoot + stockSymbol + '/metadata.json' + api_key;
        const state = {...this.state};

        return fetch(dataAPI)
        .then(res => res.json())
        .then(resJson => {
            // console.log('resJson:', resJson);

            let stockData = state.stockData;
            // let error = state.error;

            if (resJson['quandl_error']) {
                throw new Error(resJson['quandl_error'].message);
            }
            const transformedData = transformData(resJson);

            stockData.push(transformedData);
            // error = false;
            this.setState({stockData: stockData, error: false}/*, () => console.log('state after setState @ getData:', this.state)*/);
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
        // const stockNames = state.stockNames;
        // console.log('stockNames @ handleSubmit:', stockNames);
        // console.log('stockName @ handleSubmit:', stockName);
        // const stockName = stockNames[stockNames.length];
        const symbol = input.trim().toUpperCase();
        // console.log('trimmed input(symbol):', symbol);
        const stockSymbols = state.stockSymbols;
        // let packaging;
        // console.log('packaging:', packaging);
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
                // console.log('result:', result);
                // console.log('!hasSymbol:', !hasSymbol(symbol));
                if (stockDatum) {
                    var packaging = this.packageData(symbol, stockDatum);
                    stockSymbols.push(symbol);

                    this.getStockName(symbol)
                    .then(name => {
                        const packaged = packaging(name);
                        this.setState({ state }, () => {
                            // console.log('symbols to emit:', this.state.stockSymbols);
                            // console.log('names to emit:', this.state.stockNames);
                            // console.log('data to emit:', this.state.stockData);
                            socket.emit('stock symbols', this.state.stockSymbols);
                            socket.emit('stock names', this.state.stockNames);
                            socket.emit('stock data', this.state.stockData);
                            this.storeStockData(packaged);
                            // console.log('state after setState:', this.state);
                        });
                    })
                    .catch(err => console.error(err));
                }
            })
            .catch(err => console.log(err));
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
                    text: 'Stock Chart'
                },
                series: series
            });
        }

    }

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
                // console.log('state after unpacking:', this.state)
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
        // console.log('getStockData triggered');
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
        // console.log('removeStock:', symbol);
        fetch(apiUrl + queryString)
        // fetch(testUrl)
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
            // console.log('state after removeStock:', this.state);
            socket.emit('stock symbols', this.state.stockSymbols);
            socket.emit('stock names', this.state.stockNames);
            socket.emit('stock data', this.state.stockData);

        });
        this.buildChart(document.querySelector('.chart-container'))();
    }

    toggleIcon() {
        // console.log('toggledIcon');
        this.setState({
            icon: true
        }/*, () => console.log('icon on?:', this.state.icon)*/);
    }

    toggleIconOff() {
        // console.log('toggledIcon OFF');
        this.setState({
            icon: false
        }/*, () => console.log('icon on?:', this.state.icon)*/);
    }

    registerCardSymbol(evt) {
        // let cardSymbol;
        // if (evt) cardSymbol = evt.target.id;
        const cardSymbol = evt.target.id;
        // console.log('registering cardSymbol:', cardSymbol);
        this.setState({
            cardSymbol: cardSymbol
        }/*, () => console.log('cardSymbol after registering:', this.state.cardSymbol)*/);
    }

    deregisterCardSymbol(evt) {
        // const cardSymbol = evt.target.id;
        // console.log('de-registering cardSymbol:', cardSymbol);
        this.setState({
            cardSymbol: null
        }/*, () => console.log('cardSymbol after de-registering:', this.state.cardSymbol)*/);
    }

    componentDidMount() {
        // console.log('componentDidMount');
        const socket = socketIOClient();
        // console.log('socket:', socket);
        const chartContainer = document.querySelector('.chart-container');

        socket.on('stock symbols', symbols => {
            // console.log('socket.on symbols:', symbols);
            this.setState({stockSymbols: symbols})
        });
        socket.on('stock names', names => {
            // console.log('socket.on names:', names);
            this.setState({stockNames: names})
        });
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
        Highcharts.theme = theme();
        Highcharts.setOptions(Highcharts.theme);

        // const hasTen = stockSymbols.length > 9;
        // this.setState({cardsFull: hasTen});
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

        return (
            <div className='app-container'>
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
                                        {icon && (cardSymbol === sym) ? <Icon onClick={(evt) => {removeStock(evt); /*registerCardSymbol(evt); toggleIcon()*/}}
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
                        <div className='button' onClick={handleSubmit}>ADD</div>
                    </div>
                    <div className='cards-full-container'>
                        <div className='cards-full-msg-wrapper'>{cardsFull ? 'Maximum number of chartable stocks reached.' : ''}</div>
                        <div className='error-msg-wrapper'>{error ? 'Provided stock code didn\'t yield any results.' : ''}</div>
                    </div>
                </div>

            </div>
        );
    }
}

export default withRouter(App);
