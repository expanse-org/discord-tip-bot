const Web3 = require("web3");
const Discord = require("discord.js");
const Tx = require("ethereumjs-tx");
const fs = require("fs");
const botSettings = require("./config/config-bot.json");
const price = require("./price.js");
const n = require('nonce')();
// update price every 5 min
setInterval(price,300000);

const { Users, Sequelize } = require('./models');
const Op = Sequelize.Op;

const prefix = botSettings.prefix;

const bot = new Discord.Client({disableEveryone:true});
const web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider('http://localhost:9656'));


bot.on('ready', ()=>{
	console.log("Bot is ready for work");
});

async function sendCoins(authorId, toAddress, value, msg) {
	if(!toAddress || !value) return { error: true, reason: 'Amount of Exp and Discord Username are required.'}
	const from = await Users.findOne({ where: { discord_id: authorId }});
	if(!from) return { error: true, reason: "You don't have account yet, type /getAddress first."};	
	
	if(!web3.utils.isAddress(toAddress)) return { error: true, reason: 'Wrong recipient address, try another one.'}; 
	if(value.includes(',')) value = value.replace(/,/g, '.');
	let amount = Number(value);
	if(!amount) return { error: true, reason: 'Amount is not correct.'};
	amount = amount*Math.pow(10,18);

	// check reciever balance before transfer
	if(web3.utils.isAddress(from.address)) {
		var balance = await web3.eth.getBalance(from.address);
	} else {
		return { error: true, reason: 'Wrong sender address'}
	}
	
	if(balance < (amount+(0.0015*Math.pow(10,18)))) {
		return { error: true, reason: `Insufficient balance, you have **${(balance/Math.pow(10,18)).toFixed(3)} EXP** *(Txfee is 0.0015 EXP)*`};
	} 
	const rawTx = {
		nonce: web3.utils.toHex(n()),
		to: toAddress,						 
		gasPrice: web3.utils.toHex(10000000000),
		gasLimit: web3.utils.toHex(120000),
		value: amount,
		data: web3.utils.toHex('tib')
	}
	const tx = new Tx(rawTx);
	tx.sign(new Buffer(from.private_key.slice(2),'hex'));
	const serializeTx = tx.serialize();
	const result = await sendSignedPromise(serializeTx)
	return result;
}

async function sendSignedPromise(serializeTx) {
	return new Promise((resolve,reject) => {
		web3.eth.sendSignedTransaction(`0x${serializeTx.toString('hex')}`)
			.on('transactionHash', hash => {
				resolve({error: false, hash: hash})
			})
			.on('error', error => {
				console.log(error)
				reject({error: true, reason: 'Internal Error'})
			});
	})
}


bot.on('message', async msg => {
	// Not admins cannot use bot in general channel
	if(msg.channel.name === 'general' && !msg.member.hasPermission('ADMINISTRATOR')) return;
	if(msg.author.bot) return;
	if(msg.channel.type === "dm") return;

	const args = msg.content.split(' ');
	const authorId = msg.author.id;

	// tip to discord username
	if(msg.content.startsWith(`${prefix}tip`)) {
		const amount = args[2];
		const username = args[1];
		if(username.includes('@')) {
			var username_id = username.substring(2, username.length-1);
		}
		let userAddress = await Users.findOne({ where: { discord_id: username_id }});
		if(!userAddress) return msg.channel.send('Wrong username, try another one');
		userAddress = userAddress.address;
		let reciever = bot.users.find('id', username_id);
		if(!reciever) return msg.reply('Wrong username, try another one');
		// authorId, toAddress, value, msg
		const result = await sendCoins(authorId, userAddress, amount, msg);
		console.log(result)
		if(result.error) return msg.reply(result.reason);
		await changeStats(authorId, username_id, amount);
		reciever.send(`You've successfully tipped. TX: <https://www.gander.tech/tx/${result.hash}>`);
		msg.reply(`Tip sent. TX: <https://www.gander.tech/tx/${result.hash}>`);
	}

	// withdraw
	if(msg.content.startsWith(`${prefix}withdraw`)) {
		const amount = args[2];
		const toAddress = args[1];
		const result = await sendCoins(authorId, toAddress, amount, msg);
		if(result.error) return msg.reply(result.reason);
		return msg.reply(`Successfully withdraw. TX: <https://www.gander.tech/tx/${result.hash}>`);
	}

	// get donate address
	if(msg.content.startsWith(`${prefix}getAddress`)) {
		const user = await Users.findOne({ where: { discord_id: authorId }});
		if(!user) {
			const newAccount = await web3.eth.accounts.create();
			if(newAccount) {
				msg.author.send(`This is your unique deposit address: **${newAccount.address}**\nYou can deposit some Exp to this address and use your coins for tipping.\nPeople will be tipping to this address too. Try to be helpful to the community ;)`);
				await Users.create({
					discord_id: authorId,
					address: newAccount.address,
					// decrypt it?
					private_key: newAccount.privateKey,
					username: msg.author.username
				});
			}
		} else {
			return msg.author.send(`Your deposit address is: **${user.address}**`);
		}
	}

	if(msg.content == `${prefix}topDonators`) {
		const donatorsList = await Users.findAll({ where: {'sent': {[Op.ne]: null}}, order: [['sent','DESC']], limit: 10 });
		let string = "Top-10 donators:\n";
		let i = 1;
		for(let row of donatorsList) {
			string+=`${i++}) ${row.username} **${row.sent.toFixed(3)}** Exp\n`
		}
		return msg.channel.send(string)
	}

	if(msg.content == `${prefix}topRecievers`) {
		const recievesList = await Users.findAll({ where: {'received': {[Op.ne]: null}}, order: [['received','DESC']], limit: 10 });
		let string = "Top-10 recipients:\n";
		let i = 1;
		for(let row of recievesList) {
			string+=`${i++}) ${row.username} **${row.received.toFixed(3)}** Exp\n`
		}
		return msg.channel.send(string)
	}

	if(msg.content === `${prefix}stats`) {
		const price = getJson();
		try {
			var { number } = await web3.eth.getBlock('latest');
			var pendingTxs = await web3.eth.getBlockTransactionCount("pending");
			var peers = await web3.eth.net.getPeerCount();
		} catch(e) {
			return msg.channel.send("Node connection lost");
		}
		if(number && peers) {
			return msg.channel.send(`Expanse price: **${price.toFixed(3)} USD**\nExpanse Last Block: **${number}**\nPending Txs: **${pendingTxs}**\nPeers: **${peers}**`)
		} else {
			return msg.channel.send("Node connection lost.")
		}
	}

	if(msg.content.startsWith(`${prefix}rain `)){		
		if(!msg.member.hasPermission('ADMINISTRATOR')){
			return msg.channel.send("You cannot use '/rain' command");
		} 
		const amount = Number(args[1]);
		if (!amount) return msg.channel.send("Error - you've entered wrong amount");
		await raining(amount,msg);
	}
	
	// send to all registered beta-testers users
	if(msg.content.startsWith(`${prefix}rainTesters`)) {
		const value = Number(args[1]);
		let amount = value/msg.channel.members.array().length;
		if(!msg.member.hasPermission('ADMINISTRATOR')){
			return msg.channel.send("You cannot use '/rain' command");
		} 
		if(msg.channel.name == 'general') {
			const testersId = [];
			msg.channel.members.filter(user => testersId.push(user.id));
			for(let testerId of testersId) {
				const isRegister = await Users.findOne({ where: { discord_id: testerId }});
				if(!isRegister) return
				const reciever = bot.users.find('id', isRegister.discord_id);
				const result = await sendCoins(botSettings.adminId, isRegister.address, String(amount), msg);
				console.log(result)
				if(!result.error) {
					reciever.send(`Hi ${isRegister.username}, thanks for beta-testing.\nTake a tip, TX: <http://www.gander.tech/tx/${result.hash}`);
				} else {
				  return msg.channel.send(result.reason);
				}
			}
		}
	}

	// balance
	if(msg.content.startsWith(`${prefix}balance`) || msg.content.startsWith(`${prefix}bal`)) {
		const price = getJson();
		const user = await Users.findOne({ where: { discord_id: authorId }});
		if(!user) return msg.reply("Sorry, but you don't have account, type **/getAddress** first.")
		try {
			var userBal = await web3.eth.getBalance(user.address);
		} catch(e) {
			return msg.channel.send('Internal gexp error.')
		}
		if(userBal) {
			const balance = (userBal/Math.pow(10,18)).toFixed(3);
			const usdBalance = new Intl.NumberFormat('us-US').format(parseInt(balance*price));
			if(balance > 10000){
				msg.channel.send(`Your balance is: **${balance}** EXP (*${usdBalance} USD*), congrats, you are the whale.`);
			} else if(balance > 1000 && balance < 3000) {
				msg.channel.send(`Your balance is: **${balance}** EXP (*${usdBalance} USD*), congrats, you are the shark.`);
			} else if(balance > 3000 && balance < 10000) {
				msg.channel.send(`Your balance is: **${balance}** EXP (*${usdBalance} USD*), congrats, you are the dolphin.`);
			} else if(balance == 0){
				msg.channel.send(`Your wallet is empty: **${balance}** EXP`);				
			} else {
				msg.channel.send(`Your balance is: **${balance}** EXP (*${usdBalance} USD*),  you need more EXP to become a whale.`);
			}
		} else {
			return msg.channel.send('Expanse api issues');
		}
	}


	if(msg.content == `${prefix}list`){
		const allUsers = await Users.findAll();
		return msg.channel.send(`Total amount of registered users is **${allUsers.length}**.`);
	}

	if(msg.content === `${prefix}help`){
		msg.channel.send("ExpTipBit commands:\n"+
			`**${prefix}list** - shows number of registered users.\n`+
			`**${prefix}balance** *<address>* - show EXP balance on the following address.\n`+ 
			`**${prefix}tip** *<@username>* *<amount>* -send EXP to Discord User.\n`+
			`**${prefix}withdraw** *<address>* *<amount>* - withdraw EXP to your personal address.\n`+
			`**${prefix}getAddress**- get your personal Deposit Address.\n`+
			`**${prefix}topDonators** - shows the most active donators.\n`+
			`**${prefix}topRecievers** - shows the luckiest receivers.\n`+
			`**${prefix}rain** *<amount>* - send EXP to all registered and online address's (Admin Only).\n`+
			`**${prefix}rainTesters** *<amount>* - send EXP to all beta-testers (Admin Only).\n`+
			`**${prefix}stats** - show current Expanse Network Stats.`);
	}
})

// rain can use only admin
async function raining(amount,msg){
	const allUsers = await Users.findAll({ attributes: ['discord_id','address','username']});
	const onlineUsers = getOnline();
	const validUsers = allUsers.filter(user => {return onlineUsers.includes(user.discord_id) });

	amount = amount/validUsers.length;
	msg.channel.send(`It just **rained** on **${validUsers.length}** users. Check pm's.`);

	async function rainSend(addresses){
		for(let user of addresses){
			const id = user.discord_id;
			const address = user.address;
			const reciever = bot.users.find('id', id);

			const result = await sendCoins(botSettings.adminId, address, String(amount), msg);
			if(!result.error) {
				reciever.send(`Hi ${user.username}, you are lucky man.\nTX: <http://www.gander.tech/tx/${result.hash}`);
			}
		}
	}
	await rainSend(validUsers);
}

async function changeStats(senderId, recieverId, value) {
	if(value.includes(',')) value = value.replace(/,/g, '.');
	let amount = Number(value);
	let sender = await Users.findOne({ where: { discord_id: senderId } });
	let reciever = await Users.findOne({ where: { discord_id: recieverId } });
	await sender.update({
		sent:  sender.sent + amount
	})
	await reciever.update({
		received: reciever.received + amount
	})
}

// return array with id of online users
function getOnline(){
	var onlineList = [];
	var users = bot.users;
	users.keyArray().forEach((val) => {
		var userName = users.get(val).id;
		var status = users.get(val).presence.status;
		if(status == "online"){
			onlineList.push(userName);
		}
	});
	return onlineList;
}

function getJson(){
	return JSON.parse(fs.readFileSync('./usdprice.txt'));
}

bot.on('error', console.error);
bot.login(botSettings.token);
