/** @param {import("discord.js").Client<boolean>} client */
export default async (client) => {
	console.log(`Connected to Discord with ID ${client.application?.id} and tag ${client.user?.tag}`)
}
