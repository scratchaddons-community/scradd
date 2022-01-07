import {Guild, Message, MessageActionRow, MessageButton, MessageEmbed} from "discord.js";

const POTATO_BOARD = process.env.POTATOBOARD_CHANNEL_ID;

export const BOARD_EMOJI = "🥔"
export const MIN_COUNT = 1
/**
 *
 * @param {Guild} guild
 *
 */
export async function getBoardChannel(guild) {
	const {threads} = await guild.channels.fetchActiveThreads();
	return threads.find((thread) => thread.id === POTATO_BOARD);
}

/**
 *
 * @param {Message<boolean>} message
 */
export async function getMessageFromBoard(message) {
	if(!message.guild) return;
	const board= await getBoardChannel(message.guild)
	if (!board) throw new Error("No board channel found. Make sure POTATOBOARD_CHANNEL_ID is set in the .env file.");
	const fetchedMessages = await board.messages.fetch({ limit: 100 });
	return fetchedMessages.find((m) => !!m.embeds.at(-1)?.footer?.text.endsWith(" "+message.id));
}

/**
 *
 * @param {Message<boolean>} message
 */
export async function postMessageToBoard(message) {
	if (!message.guild) return;

	const author = await message.guild?.members.fetch(message.author).catch(()=>{});

	const board= await getBoardChannel(message.guild)
	if (!board) throw new Error("No board channel found. Make sure POTATOBOARD_CHANNEL_ID is set in the .env file.");

	const embed = new MessageEmbed()
		.setColor(author?.displayHexColor||0x000000)
		.setDescription(message.content || "")
		.setAuthor({
			name: author?.displayName||message.author.username,
			iconURL: author?.displayAvatarURL() || message.author.displayAvatarURL()||message.author.defaultAvatarURL||"",
		})
		.setTimestamp(new Date())
		.setFooter({ text: "Message ID: "+ message.id });

	const embeds=[...message.embeds,embed]
	while(embeds.length>10) embeds.shift()

const button=new MessageButton().setEmoji("👀").setLabel("View Context").setStyle("LINK").setURL("https://discord.com/channels/"+message.guild.id+"/"+message.channel.id+"/"+message.id)

	await board.send({
		content: `**${BOARD_EMOJI} ${message.reactions.resolve(BOARD_EMOJI)?.count || 0}** | ${message.channel}`+(author?` | ${author}`:""),
		embeds,
		files: message.attachments.map(a => a),
		components: [new MessageActionRow()
			.addComponents(button)]
	});
}

/**
 *
 * @param {number} newCount
 * @param {Message<boolean>} boardMessage
 */
export async function updateReactionCount(newCount, boardMessage) {
	if(newCount<MIN_COUNT) return boardMessage.delete();
	return boardMessage.edit({
		content: boardMessage.content.replace(/ \d+\*\*/,` ${newCount}**`),
		embeds: boardMessage.embeds,
		files: boardMessage.attachments.map(a => a),
	});

}
