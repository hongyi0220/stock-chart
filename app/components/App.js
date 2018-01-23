import React from 'react';
import { withRouter, Route, Switch } from 'react-router-dom';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            input: null,
            stockData: [],
            stockSymbols: [],
            packaged: null
        }
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.buildChart = this.buildChart.bind(this);
        this.storeStockData = this.storeStockData.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.packageData = this.packageData.bind(this);
        this.unpackData = this.unpackData.bind(this);
    }

    getData(stockSymbol) {
        // console.log('stockSym arg @ getData:', stockSym);
        const api_key = 'mx7b4emwTWnteEaLCztY';
        const apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/' + stockSymbol + '/data.json?api_key=';

        return fetch(apiUrl + api_key)
        .then(res => res.json())
        .then(resJson => {
            // console.log('resJson:', resJson);
            const state = {...this.state};
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
        console.log('evt.key', evt.key);
        const key = evt.key;
        if (key === 'Enter') this.handleSubmit();
    }

    handleSubmit() {
        const socket = socketIOClient();
        const state = {...this.state};
        const input = state.input;
        const symbol = input.trim().toUpperCase();
        // console.log('trimmed input(symbol):', symbol);
        const stockSymbols = state.stockSymbols;

        function hasSymbol(sym) {
            for (let i = 0; i < stockSymbols.length; i++) {
                if (stockSymbols[i] === sym) return true;
            }
            return false;
        }
        this.getData(symbol)
        .then(stockDatum => {
            // console.log('result:', result);
            // console.log('!hasSymbol:', !hasSymbol(symbol));
            if (!hasSymbol(symbol) && stockDatum) {
                const packaged = this.packageData(symbol, stockDatum);
                // state.package = package;
                stockSymbols.push(symbol);
                this.setState({state}, () => {
                    socket.emit('stock symbols', this.state.stockSymbols);
                    socket.emit('stock data', this.state.stockData);
                    this.storeStockData(packaged);
                    // console.log('state after setState:', this.state);
                });
            }
        })
        .catch(err => {
            console.log(err);
        });

    }

    buildChart(where) {

        // A function that uses closure
        return function build(stockData, stockSymbols) {
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

    packageData(symbol, stockDatum) {
        const packaged = {
            stockSymbol: symbol,
            stockDatum: stockDatum
        }
        return packaged;
    }

    unpackData(data, fn) {
        let stockSymbols = [];
        let stockData = [];
        data.forEach(d => {
            stockSymbols.push(d.stockSymbol);
            stockData.push(d.stockDatum);
        });
        this.setState({
            stockSymbols: stockSymbols,
            stockData: stockData
        }, () => {
            // This fn already has chartContainer passed-in as an argument
            if (fn) fn(stockData, stockSymbols);
            console.log('state after unpacking:', this.state)
        });
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

    // componentWillMount() {
    //     console.log('componentWillMount');
    //     // this.getStockData()
    //     // .then(packaged => this.unpackData(packaged))
    //     // .catch(err => console.error(err));
    // }


    componentDidMount() {
        console.log('componentDidMount');
        const socket = socketIOClient();
        // console.log('socket:', socket);
        const chartContainer = document.querySelector('.chart-container');

        socket.on('stock symbols', symbols => this.setState({stockSymbols: symbols}));
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
            console.log('has localStorage');
            const visited = localStorage.getItem('visited');
            if (!visited) {
                console.log('first time visit');
                localStorage.setItem('visited', 'true');
                console.log('stockData, stockSymbols:', stockData, stockSymbols);
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


        // this.buildChart(chartContainer, dataset, stockSymbols);
    }

    // componentWillUnmount() {
    //     console.log('componentWillUnmount triggered');
    //     if (localStorage) localStorage.clear();
    // }

    render() {
        const handleSubmit = this.handleSubmit;
        const handleInput = this.handleInput;
        const stockSymbols = this.state.stockSymbols;
        const handleKeyDown = this.handleKeyDown;

        return (
            <div className='app-container'>
                <div className='chart-container'></div>
                <div className='cards-container'>Stock cards go here</div>
                <div className='search-bar'>
                    <input onChange={handleInput} onKeyDown={handleKeyDown} type='text' placeholder='APPL'/>
                    <button onClick={handleSubmit}>Add</button>
                </div>
            </div>
        );
    }
}

export default withRouter(App);
