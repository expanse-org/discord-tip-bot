"use strcit";

const Web3 = require("web3");
const Discord = require("discord.js");
const BigNumber = require('bignumber.js');
const Tx = require("ethereumjs-tx");
const fs = require("fs");
const botSettings = require("./config.json");

const prefix = botSettings.prefix;

const bot = new Discord.Client({disableEveryone:true});

var web3 = new Web3();
var n = require('nonce')();

web3.setProvider(new web3.providers.HttpProvider('http://localhost:9656'));
const privateKey = new Buffer(botSettings.privateKey,'hex');

bot.on('ready', ()=>{
	console.log("Bot is ready");

});


// return array with names of online users
function getOnline(){
	var foo = [];
	var users = bot.users;
	users.keyArray().forEach((val) => {
		var userName = users.get(val).username;
		var status = users.get(val).presence.status;
		if(status == "online"){
			foo.push(userName);
		}
	});
	return foo;
}


var localAddress;
async function getAddress(private){
	let data = await web3.eth.accounts.privateKeyToAccount(private);
	localAddress = data.address;

}
getAddress("0x" + botSettings.privateKey);

function getJson(){
	return JSON.parse(fs.readFileSync('data/users.json'));
}


async function sendCoins(address,value,message){
	let privateData = await web3.eth.accounts.privateKeyToAccount("0x" + botSettings.privateKey);
	let lastBlock = await web3.eth.getBlock("latest");
   
   	var rawTx = {
		nonce: n(),
		gasPrice: web3.utils.toHex(1000000000), 
		gasLimit:  web3.utils.toHex(lastBlock.gasLimit), 
		to: address, 
		value:  value, 
		data:  web3.utils.toHex('0x')
	};

	var tx = new Tx(rawTx);
	tx.sign(privateKey);

	var serializedTx = tx.serialize();

	web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
	.on('transactionHash', function(hash){
		message.channel.send("HASH: http://www.gander.tech/tx/"+ hash );
	})
	.on('receipt', console.log);
}


bot.on('message', message => {
	if(message.author.bot) return;
	if(message.channel.type === "dm") return;

	var message = message;
	let args = message.content.split(' ');

	if(message.content.startsWith(prefix + "sendToAddress ")){ 
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/send' command");
		} 
		let address = args[1];
		let amount = Number(args[2]);
		// if use wrong amount (string or something)
		if (!amount) return message.channel.send("Error with wrong amount");
		let weiAmount = amount*Math.pow(10,18);

		if(web3.utils.isAddress(args[1])){
			if(amount>10){
				message.channel.send("You try to send more that 10 EXP ");
			} else {
				// main function
				sendCoins(address,weiAmount,message);
				message.channel.send("You try to send " + amount + " Exp to " + address + " address.");
			}
		} else {
			message.channel.send("Wrong address to send");
		}
	}

	if(message.content.startsWith(prefix + "send ")){
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/send' command");
		}
		let user = args[1];
		let amount = Number(args[2]);
		// if use wrong amount (string or something)
		if (!amount) return message.channel.send("Error with wrong amount");
		
		let weiAmount = amount*Math.pow(10,18);
		let data = getJson();
		if(Object.keys(data).includes(user)){
			let address = data[user];
			
			sendCoins(address,weiAmount,message); // main function
			message.channel.send("You try to send " + amount+ " EXP to @"+user  );
		} else {
			message.channel.send("This user are not registered.");
		}

	}

	if(message.content.startsWith(prefix + "rain")){		
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/rain' command");
		} 
		// registered users
		var data = getJson();
		// online users
		var onlineUsers = getOnline();
		// create online and register array
 		var onlineAndRegister = Object.keys(data).filter(username => {return onlineUsers.indexOf(username)!=-1});
 	 	// array with online addresses
 	 	
		var latest = [];
		for (let user of onlineAndRegister) {
		  if (data[user]) {
		    latest.push(data[user]);
		  }
		}
		
		var amount = Number(args[1])/latest.length;
		// if use wrong amount (string or something)
		if (!amount) return message.channel.send("Error with wrong amount");
		var weiAmount = amount*Math.pow(10,18);
		
		message.channel.send("**Rain started**.\n" + args[1] + " EXP will be distributed between online and regitered users - **" + latest.length + "** users." );
		async function rainSend(addresses){
			for(const address of addresses){
				const result = await sendCoins(address,weiAmount,message);
				console.log(result);
			}
		}
		// main function
		rainSend(latest);
	}

	if(message.content.startsWith(prefix + "checkaddress")){
		var address = args[1];
		if(web3.utils.isAddress(args[1])){
			web3.eth.getBalance(args[1], (error,result)=>{
				if(!error){
					var balance = (result/Math.pow(10,18)).toFixed(3);
					if(balance > 10000){
						message.channel.send("This balance has: " + balance + " EXP, congrats, you are Exp whale.");
					} else if(balance == 0){
						message.channel.send("This balance empty, it has: " + balance + " EXP.");
					} else {
						message.channel.send("Your balance is " + balance + " EXP, you need more Exp  to became a whale.");
					}
				} else {
					message.channel.send("Oops, some problems with your address");
				}
			})
		} else {
			message.channel.send("Wrong address, try another one");
		}	
	}

	if(message.content === prefix + "getaddress"){
		message.channel.send("Bots address is " + localAddress);
	}
	
	if(message.content.startsWith("/register")){
		var author = message.author.username;
		var address = args[1];

		if(web3.utils.isAddress(args[1])){	
			var data = getJson();			
			if(!Object.values(data).includes(address) && !Object.keys(data).includes(author)){		
				data[author] = address;
				message.channel.send("@" + author + " registered new address: " + address);
				
				fs.writeFile(botSettings.path, JSON.stringify(data), (err) => {
				  if (err) throw err;
				  console.log('The file has been saved.');
				});	
				
			} else {
				message.channel.send("You already registered.");
			}
		} else {
			message.channel.send("@" + author + " try to registered wrong address. Try another one.");
		}
	}

	if(message.content.startsWith(prefix + "changeRegister")){
		var author = message.author.username;
		var address = args[1];
		if(web3.utils.isAddress(args[1])){
			var data = getJson();
			if(Object.keys(data).includes(author)){
				data[author] = address;
				fs.writeFile(botSettings.path, JSON.stringify(data), (err) => {
				  if (err) throw err;
				  console.log('The file has been changed.');
				});	
				message.channel.send("@" + author + " changed register address to the: " + address);
			} else {
				message.channel.send("You are not in the list, use **/register** command fist.");
			}
		} else {
			message.channel.send("@"+author+" try to change with wrong address. Try another one.");
		}
	}
	//-------------------------------------
	if(message.content == prefix + "list"){
		var data = getJson();	
		message.channel.send("List of registered users: " + String(Object.keys(data))+ ".");

	}

	if(message.content === prefix + "help"){
		message.channel.send("ExpTipBit commands:\n"+
			"**/checkaddress** *<address>* -  show EXP balance on the following address \n"+
			"**/sendToAddress** *<address>* *<amount>* - send EXP to the following address (Admin Only)\n"+
			"**/send** *<name>* *<amount>* send EXP to the following user (Admin Only)\n"+
			"**/rain** *<amount>* - send EXP to all registered address's ((Admin Only)).\n"+
			"**/getaddress** - shows bot address so everyone can fund it. \n" + 
			"**/register** *<address>*  - saves user address and name to db. \n"+
			"**/changeRegister** *<address>* -  change your register address.\n"+
			"**/list** - shows all registered users.");
	}
})


bot.login(botSettings.token);
