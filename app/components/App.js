import React from 'react';
import { withRouter, Route, Switch } from 'react-router-dom';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            input: null,
            dataset: [],
            stockSymbols: []
        }
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.buildChart = this.buildChart.bind(this);
        this.storeStockData = this.storeStockData.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    getData(stockSym) {
        // console.log('stockSym arg @ getData:', stockSym);
        const api_key = 'mx7b4emwTWnteEaLCztY';
        const apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/' + stockSym + '/data.json?api_key=';

        return fetch(apiUrl + api_key)
        .then(res => res.json())
        .then(resJson => {
            // console.log('resJson:', resJson);
            const state = {...this.state};
            let dataset = state.dataset;

            if (resJson['quandl_error']) {
                throw new Error(resJson['quandl_error'].message);
            }
            const transformedData = transformData(resJson);

            dataset.push(transformedData)
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
        .then(result => {
            // console.log('result:', result);
            // console.log('!hasSymbol:', !hasSymbol(symbol));
            if (!hasSymbol(symbol) && result) stockSymbols.push(symbol);
            this.setState({state}, () => {
                socket.emit('stock symbols', this.state.stockSymbols);
                socket.emit('stock dataset', this.state.dataset);
                this.storeStockData(symbol);
                // console.log('state after setState:', this.state);
            });
        })
        .catch(err => {
            console.log(err);
        });

    }

    buildChart(where, dataset, stockSymbols) {
        let series = [];

        for (let i = 0; i < stockSymbols.length; i++) {
            const datum = {
                name: stockSymbols[i],
                data: dataset[i],
                tooltip: {
                    valueDecimals: 2
                }
            };
            series.push(datum);
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

    storeStockData(symbol) {
        // const stockSymbols = state.stockSymbols;
        // const dataset = state.dataset;

        const apiUrl = 'http://localhost:8080/stock';
        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stockSymbol: symbol
                // dataset: dataset <-- Too large
            })
        }
        fetch(apiUrl, init)
        .catch(err => {
            console.error(err);
        });
    }

    getStockData() {
        const apiUrl = 'http://localhost:8080/getstock';
        fetch(apiUrl)
        .then(res => res.json())
        .then(resJson => this.setState({stockSymbols: resJson}))
        .catch(err => {
            console.error(err);
        });
    }

    componentDidMount() {
        const socket = socketIOClient();
        const chartContainer = document.querySelector('.chart-container');

        socket.on('stock symbols', symbols => this.setState({stockSymbols: symbols}));
        socket.on('stock dataset', dataset => {

            const stockSymbols = this.state.stockSymbols;
            this.setState({dataset: dataset});
            this.buildChart(chartContainer, dataset, stockSymbols);
            // console.log('setState @ compDidMnt:', this.state);
        });

        const state = {...this.state};
        // console.log('{...this.state} @ compDidMnt:', state);
        const stockSymbols = state.stockSymbols;
        const dataset = state.dataset;

        // this.buildChart(chartContainer, dataset, stockSymbols);
    }

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
