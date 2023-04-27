const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (
		message.channel.isDMBased() &&
		message.author.id !== client.user.id &&
		CONSTANTS.channels.contact?.permissionsFor(message.author)?.has("ViewChannel")
	) {
		return await message.channel.send({
			content: `Are you trying to contact mods? We now use ${CONSTANTS.channels.contact?.toString()} instead of DMs!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Contact Mods",
							custom_id: "_contactMods",
						},
					],
				},
			],
		});
	}
};
