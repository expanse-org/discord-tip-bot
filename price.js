"use strict";
var request = require("request");
var fs = require("fs");

const MARKETCAP = 'https://api.coinmarketcap.com/v1/ticker/';

var data = {};

function getPrice(){
	request(MARKETCAP + 'Expanse', (error, response, body)=>{
		try{
			var dataCoin = JSON.parse(body);
		} catch (e) {
			console.log("Api Coinmarket Problem" + e);
			return
		}
		var marketcapInfo = dataCoin[0];
		data.priceUSD  = marketcapInfo['price_usd'];

		fs.writeFile("usdprice.txt",data.priceUSD,(err)=>{
			if(err) throw err;
			//console.log('File with price was updated');
		});
	});
}
module.exports = getPrice;