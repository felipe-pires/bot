const axios = require('axios');
const currencyFormatter = require('currency-formatter');
const fs = require('fs');

let endpoints = [
    'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m'
]

let status = "N/A";
let bought = 0;
let balance = 100000;
const process = {
    _calcRSI(closes){
        let gains = 0;
        let losses = 0;

        for(let i = closes.lenght - 14; i < closes.lenght; i++){
            const diff = closes[i] - closes[i - 1];

            if(diff >= 0){
                gains+= diff;
            }
            if(diff < 0){
                losses-= diff;
            }
        }
        const strength = gains / losses;
        return 100 - (100 / (1 + strength));
    },
    _priceFormatter(price, currency){
        return currencyFormatter.format(price, { code: currency });
    },
    _exportJson(data){
        let newJson = [];
        fs.readFile('./data.json', 'utf8', (err, json) => {
            if(err) throw err;
            newJson = JSON.parse(json);
            newJson.push(data);
            fs.writeFileSync('data.json', JSON.stringify(newJson));
        }); 
    },
    async init(){
        status = "N/A";
        const [response] = await axios.all(endpoints.map(endpoint => axios.get(endpoint)));
        const candle = response.data[499];
        const closes = response.data.map(allCandles => allCandles[4]);
        const rsi = process._calcRSI(closes);
        const price = parseFloat(candle[4]);
        const balanceFormatter = process._priceFormatter(balance, 'USD');
        const priceFormatter = process._priceFormatter(price, 'USD');
        const data = {rsi, price: priceFormatter, time: new Date().toISOString(), balance : balanceFormatter,status};

        if(rsi >= 70 && bought <= 2){
            status = 'Sobrecomprado';
            balance += price;
        }
        if(rsi >= 70 && bought > 2){
            status = 'Limite Alcançado';
        }
        if(price <= 30 && balance > 0 && price > balance){
            status = 'Sobrevendido';
            balance-= price;
        }

        console.table(data);
        process._exportJson();
    }
}

setInterval(process.init, 60000);