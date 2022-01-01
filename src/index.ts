import { Client, Intents } from 'discord.js'

import dotenv from 'dotenv'
import commands from "./getCommands";

dotenv.config()

const client = new Client({intents: [Intents.FLAGS.GUILDS]})



client.on('interactionCreate', async interaction => {
  //let guildsID = [];
  if (!interaction.isCommand()) { return }
  const command = commands[ interaction.commandName ];
  if(!command)return
  return command.onInteraction(interaction)
});


client.once('ready', () => {
	console.log('Ready!')
})

client.login(process.env.TOKEN)
