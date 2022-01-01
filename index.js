const fs = require('fs')
const { Client, Collection, Intents } = require('discord.js')

require('dotenv').config()
const config = require("./config.json")
const client = new Client({intents: [Intents.FLAGS.GUILDS]})

const beeptools = require("beeptools")
beeptools.RegisterSlash(process.env.TOKEN, config.guildId, config.clientId, "/home/runner/sa-bot/commands");
// Now my slash commands are up to date :D

client.on('interactionCreate', async interaction => {
  //let guildsID = [];
  if (interaction.isCommand()) {
    var cmd = require(__dirname + '/commands/' + interaction.commandName + '.js').run;
    cmd(interaction);
  };
});


client.once('ready', () => {
	console.log('Ready!')
})

client.login(process.env.TOKEN)
