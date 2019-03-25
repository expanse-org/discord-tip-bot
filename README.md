
# discord-tip-bot

Bot created for Expanse discord channel. <https://discord.me/expanse>.
Bot use web3.js, so you need to run local node or another opened Expanse node.

**Bot can:**
* check balance on EXP address. 
* tip discord users in EXP.
* withdraw EXP to any address.
* create a unique new address for each user..
* shows list of the most active donators.
* shows list of the most luckiest receivers.
* show Expanse stats.
* make rain (distibute some Exp between registered and online users)
* make rainTesters (distibute some Exp between beta-testers)
* shows list of registered users.
* shows all commands.


## How to run
### Change configs
* Change config-bot.json file. 
* Add your discord id to use /rain commands.
* Add bot token (it will generate here - <https://discordapp.com/developers/applications/me>)
* Add or change prefix, you can use "!","/","$" or any another string.
### Run bot
* Run Expanse node
* Clone the sourse code `git clone https://github.com/expanse-org/discord-tip-bot`
* Open discord-tip-bot folder `cd discord-tip-bot`
* Install all dependecies with `npm install`
* Create new model `sequelize db:migrate`
* Run bot `node index.js`

Run local node with:
	./gexp --rpc 
