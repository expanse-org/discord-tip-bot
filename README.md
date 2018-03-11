# ExpTipBot

Bot created for Expanse discord channel. <https://discord.me/expanse>.
Bot use web3.js, so you need to run local node or another opened Expanse node.

**Bot can:**
* send and receive EXP from users. 
* register and change registration (all data about users saves in json file).
* check balance on Exp address.
* shows list of registered users.
* shows all commands.




## How to run
Change config.json file. 
* Add your private key without "0x".
* Add bot token (it will generate here - <https://discordapp.com/developers/applications/me>)
* Add or change path if you wanna use another path or file name.
* Add or change prefix, you can use "!","/","$" or any another string.

Run local node with:

	./gexp --rpc
Then run bot with:
	
    node index.js



