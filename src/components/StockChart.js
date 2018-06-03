import React from 'react';
import {
  Transition,
  Icon,
} from 'semantic-ui-react';
import socketIOClient from 'socket.io-client';
import Highcharts from 'highcharts/highstock';
import { theme } from '../theme';
import PropTypes from 'prop-types';

export default class StockChart extends React.Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func,
      location: PropTypes.shape({
        pathname: PropTypes.string
      })
    }),
  };
  state = {
    input: '',
    stockData: [],
    stockSymbols: [],
    stockNames: [],
    packaged: null,
    mousedOverCardSymbol: null,
    cardsFull: false,
    error: null,
  };

  componentDidMount() {
    const socket = socketIOClient();
    const chartContainer = document.querySelector('.chart-container');
    // Listen for change
    socket.on('stock symbols', symbols => {
      this.setState({ stockSymbols: symbols });
    });
    socket.on('stock names', names => {
      this.setState({ stockNames: names });
    });
    socket.on('stock data', stockData => {
      const stockSymbols = this.state.stockSymbols;
      this.setState({ stockData: stockData });
      this.buildChart(chartContainer)(stockData, stockSymbols);
    });

    if (localStorage) {
      const visited = localStorage.getItem('visited');
      if (!visited) {
        console.log('no visit info in localStorage getting stock data ');
        localStorage.setItem('visited', 'true');

        this.getStockData()
          .then(packagedData => {
            this.unpackStockData(packagedData);
            this.buildChart(chartContainer)(this.state.stockData, this.state.stockSymbols);
          })
          .catch(err => console.error(err));
      }
    }

    window.onbeforeunload = function() {
      localStorage.removeItem('visited');
    };

    Highcharts.theme = theme();
    Highcharts.setOptions(Highcharts.theme);
  }

  getApiKey = () => {
    return fetch('/key', {
      method: 'GET',
    })
      .then(res => res.json())
      .then(res => res.key);
  }

  // Get sotck data
  getStockName = async stockSymbol => {
    const apiKey = await this.getApiKey();
    const url = `https://www.quandl.com/api/v3/datasets/WIKI/${stockSymbol}/metadata.json?api_key=${apiKey}`;
    const state = {...this.state};

    return fetch(url)
      .then(res => res.json())
      .then(resJson => {
        const stockName = resJson.dataset.name.slice(0, resJson.dataset.name.indexOf('(')).trim();
        state.stockNames.push(stockName);
        this.setState({ state });
        return stockName;
      })
      .catch(err => console.error(err));
  }

  // Get stock time-series data with Quandl API
  getStockTimeSeriesData = async stockSymbol => {
    const apiKey = await this.getApiKey();
    const url = `https://www.quandl.com/api/v3/datasets/WIKI/${stockSymbol}/data.json?api_key=${apiKey}`;
    const state = {...this.state};
    const stockData = state.stockData;

    return fetch(url)
      .then(res => res.json())
      .then(resJson => {
        if (resJson['quandl_error']) {
          throw new Error(resJson['quandl_error'].message);
        }
        const transformedData = this.transformData(resJson);

        stockData.push();
        this.setState({ stockData, error: false, });
        return transformedData;
      })
      .catch(err => {
        console.error(err);
        this.setState({ error: true });
      });
  }

  transformData = data => {
    console.log('original data:', data);
    return data['dataset_data'].data.map(d => {
      //d = ["Date", "Open", "High", "Low", "Close", "Volume", "Ex-Dividend", "Split Ratio", "Adj. Open", "Adj. High", "Adj. Low", "Adj. Close", "Adj. Volume"]
      const dateString = d[0];
      const date = Date.parse(dateString);
      const stockValue = d[4];
      console.log('stockValue:', stockValue);
      return [date, stockValue];
    }).reverse();
  }

  handleInputChange = evt => {
    this.setState({
      input: evt.target.value,
      error: false,
    });
  }

  // Detect keyboard enter key
  handleInputKeyDown = evt => {
    if (evt.key === 'Enter') {
      this.handleAddButtonClick();
    }
  }

  handleAddButtonClick = () => {
    const socket = socketIOClient();
    const state = {...this.state};
    const input = state.input;
    const symbol = input.trim().toUpperCase();
    const stockSymbols = state.stockSymbols;
    const hasSymbol = stockSymbols.includes(symbol);
    const cardsFull = stockSymbols.length >= 5;

    this.setState({ cardsFull, input: '', });

    if (!hasSymbol && !cardsFull) {
      this.getStockTimeSeriesData(symbol)
        .then(stockData => {
          if (stockData) {
            var packagingStockData = this.packageStockData(symbol, stockData);
            
            stockSymbols.push(symbol);

            this.getStockName(symbol)
              .then(name => {
                const packagedStockData = packagingStockData(name);
                this.setState({ state }, () => {
                  // Emit stock data to server with socket.io
                  socket.emit('stock symbols', this.state.stockSymbols);
                  socket.emit('stock names', this.state.stockNames);
                  socket.emit('stock data', this.state.stockData);
                  this.storeStockData(packagedStockData);
                });
              });
          }
        })
        .catch(err => console.log(err));
    }
  }

  // Build stock chart
  buildChart = where => {
    const defaultData = this.state.stockData;
    const defaultSymbols = this.state.stockSymbols;

    return function build(stockData = defaultData, stockSymbols = defaultSymbols) {
      const series = [];

      stockSymbols.forEach((sym, i) => {
        series.push({
          name: sym,
          data: stockData[i],
          tooltip: {
            valueDecimals: 2
          },
        });
      });

      new Highcharts.stockChart(where, {
        rangeSelector: {
          selected: 1
        },
        title:  {
          text: 'Stock Chart'
        },
        series: series,
      });
    };
  }

  // Aggregate stock time-series data, metadata and symbol before sending it to database
  packageStockData = (stockSymbol, stockData) => {
    return function(stockName) {
      return {
        stockSymbol,
        stockName,
        stockData,
      };
    };
  }

  // Format packaged data from DB into 3 seperate data: stock symbols, names, and time-series data
  //these are used to build stock chart
  unpackStockData = packagedData => {
    let stockSymbols = [];
    let stockData = [];
    let stockNames = [];
    packagedData.forEach(datum => {
      stockSymbols.push(datum.stockSymbol);
      stockData.push(datum.stockDatum);
      stockNames.push(datum.stockName);
    });
    if (!stockSymbols.length) {
      stockSymbols = ['EXMPL'];
      stockData = [ [[1395878400000,388.46],[1395964800000,459.99],[1396224000000,556.97],[1396310400000,367.16],[1396396800000,567],[1396483200000,369.74],[1396569600000,443.14],[1396828800000,538.15],[1396915200000,554.9],[1397001600000,664.14]] ];
      stockNames = ['Example Inc.'];
    }
    this.setState({
      stockSymbols,
      stockData,
      stockNames,
    });
  }
  // Send packaged stock data to be stored in database
  storeStockData = packagedStockData => {
    fetch('/stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packagedStockData,
      }),
    })
      .catch(err => console.error(err));
  }

  // Retrieve stock data from database
  getStockData = () => {
    return fetch('/stock', {
      method: 'GET',
    })
      .then(res => res.json())
      .then(resJson => resJson)
      .catch(err => console.error(err));
  }

  // Remove a particular stock datum from state and database
  removeStock = evt => {
    evt.stopPropagation();
    const socket = socketIOClient();
    const symbol = evt.target.dataset.symbol;
    const query = `?symbol=${symbol.toLowerCase()}`;

    fetch(`/stock${query}`, {
      method: 'DELETE',
    })
      .catch(err => console.error(err));

    const state = {...this.state};
    const stockSymbolIndex = state.stockSymbols.indexOf(symbol);
    state.stockSymbols.splice(stockSymbolIndex, 1);
    state.stockData.splice(stockSymbolIndex, 1);
    state.stockNames.splice(stockSymbolIndex, 1);

    this.setState({ state }, () => {
      socket.emit('stock symbols', this.state.stockSymbols);
      socket.emit('stock names', this.state.stockNames);
      socket.emit('stock data', this.state.stockData);

    });

    this.buildChart(document.querySelector('.chart-container'))();
  }

  // Set stock symbol in state for mouse-over event
  registerCardSymbol = evt => {
    evt.stopPropagation();
    this.setState({
      mousedOverCardSymbol: evt.target.dataset.symbol,
    });
  }

  // Unset stock symbol in state
  deregisterCardSymbol = evt => {
    evt.stopPropagation();
    this.setState({
      mousedOverCardSymbol: null,
    });
  }

  render() {
    const stockInfo = this.state.stockSymbols.map((sym,i) => [sym, this.state.stockNames[i]]);

    return (
      <div className='stock-chart-page-container'>
        <div className='logo-wrapper' onClick={() => {this.props.history.push('/');}}>
            <img className='back-arrow' src='/img/back-arrow.png' alt='go back'/>
        </div>
        <div className='chart-container'>
        </div>
        <div className='cards-container'>
          {stockInfo.map((si, i) => {
            const sym = si[0];
            const name = si[1];
            return (
              <div className='transition-wrapper' key={i} onMouseLeave={this.deregisterCardSymbol}>
                <Transition animation='fade' duration={600} transitionOnMount={true}>
                  <div className='stock-card'>
                    <div className='stock-symbol-wrapper' data-symbol={sym} onMouseOver={this.registerCardSymbol}>
                      {sym}
                    </div>
                    <div className='stock-name-wrapper' data-symbol={sym} onMouseOver={this.registerCardSymbol}>
                      {name}
                    </div>
                    {this.state.mousedOverCardSymbol === sym && <Icon data-symbol={sym} onClick={this.removeStock} className='icon' color='grey' name='delete'></Icon>}
                  </div>
                </Transition>
              </div>);
            })
          }
        </div>

        <div className='search-bar-container'>
          <div className='search-bar-wrapper'>
            <input onChange={this.handleInputChange} onKeyDown={this.handleInputKeyDown} type='text' placeholder='Enter a stock symbol..' value={this.state.input}/>
            <div className='button' onClick={this.handleAddButtonClick}>ADD</div>
          </div>
          <div className='msgs-container'>
            <div className='msg-wrapper'>
              {this.state.cardsFull && 'Maximum number of chartable stocks reached.'}
            </div>
            <div className='msg-wrapper'>
              {this.state.error && 'Provided stock code didn\'t yield any results.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
