const fs = require('fs')
const { Client, Collection, Intents } = require('discord.js')

require('dotenv').config()

const client = new Client({intents: [Intents.FLAGS.GUILDS]})

client.commands = new Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command)
}

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return

	const command = client.commands.get(interaction.commandName)

	if (!command) return;

	try {
		await command.execute(interaction)
	} catch (error) {
		console.error(error)
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
	}
});


client.once('ready', () => {
	console.log('Ready!')
})

client.login(process.env.TOKEN)
