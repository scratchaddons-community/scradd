import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	GuildMember,
	InviteTargetType,
	SlashCommandBuilder,
	VoiceChannel,
} from "discord.js";
import {
	joinVoiceChannel,
	VoiceConnectionStatus,
	entersState,
	createAudioPlayer,
	NoSubscriberBehavior,
	createAudioResource,
	StreamType,
	// AudioPlayerStatus,
} from "@discordjs/voice";
import type { ChatInputCommand } from "../common/types/command.js";
import { guild } from "../client.js";
import { createReadStream } from "fs";
import url from "node:url";
import path from "path";
import CONSTANTS from "../common/CONSTANTS.js";

const info: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription("Voice channel commands")
		.addSubcommand((input) =>
			input
				.setName("activity")
				.setDescription("Start an activity")
				.addStringOption((input) =>
					input
						.setName("activity")
						.setDescription("The activity to start")
						.setRequired(true)
						.addChoices(
							{ name: "Poker Night", value: "755827207812677713" },
							{ name: "Chess in the Park", value: "832012774040141894" },
							{ name: "Checkers in the Park", value: "832013003968348200" },
							{ name: "Blazing 8s", value: "832025144389533716" },
							{ name: "Watch Together", value: "880218394199220334" },
							{ name: "Letter League", value: "879863686565621790" },
							{ name: "Word Snacks", value: "879863976006127627" },
							{ name: "Sketch Heads", value: "902271654783242291" },
							{ name: "SpellCast", value: "852509694341283871" },
							{ name: "Land-io", value: "903769130790969345" },
							{ name: "Putt Party", value: "945737671223947305" },
							{ name: "Bobble League", value: "947957217959759964" },
							{ name: "Know What I Meme", value: "950505761862189096" },
							{ name: "AskAway", value: "976052223358406656" },
							{ name: "Bash Out", value: "1006584476094177371" },
						),
				)
				.addChannelOption((input) =>
					input
						.setName("channel")
						.setDescription("The channel to start the activity in")
						.addChannelTypes(ChannelType.GuildVoice),
				),
		),
	// .addSubcommand((input) =>
	// 	input
	// 		.setName("sound")
	// 		.setDescription("Play a sound")
	// 		.addStringOption((input) =>
	// 			input
	// 				.setName("sound")
	// 				.setDescription("The sound to play")
	// 				.setRequired(true)
	// 				.addChoices(
	// 					{ name: "Poker Night", value: "755827207812677713" },
	// 					{ name: "Chess in the Park", value: "832012774040141894" },
	// 					{ name: "Checkers in the Park", value: "832013003968348200" },
	// 					{ name: "Blazing 8s", value: "832025144389533716" },
	// 					{ name: "Watch Together", value: "880218394199220334" },
	// 					{ name: "Letter League", value: "879863686565621790" },
	// 					{ name: "Word Snacks", value: "879863976006127627" },
	// 					{ name: "Sketch Heads", value: "902271654783242291" },
	// 					{ name: "SpellCast", value: "852509694341283871" },
	// 					{ name: "Land-io", value: "903769130790969345" },
	// 					{ name: "Putt Party", value: "945737671223947305" },
	// 					{ name: "Bobble League", value: "947957217959759964" },
	// 					{ name: "Know What I Meme", value: "950505761862189096" },
	// 					{ name: "AskAway", value: "976052223358406656" },
	// 					{ name: "Bash Out", value: "1006584476094177371" },
	// 				),
	// 		)
	// 		.addChannelOption((input) =>
	// 			input
	// 				.setName("channel")
	// 				.setDescription("The channel to play the sound in")
	// 				.addChannelTypes(ChannelType.GuildVoice),
	// 		),
	// )

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");

		const channel = [
			interaction.options.getChannel("channel"),
			interaction.channel,
			interaction.member.voice.channel,
		].find((channel): channel is VoiceChannel => channel instanceof VoiceChannel);

		if (!channel)
			return interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} Please select or join a voice channel!`,
			});

		switch (interaction.options.getSubcommand(true)) {
			case "activity": {
				const invite = await channel.createInvite({
					maxUses: 1,
					targetType: InviteTargetType.EmbeddedApplication,
					targetApplication: interaction.options.getString("activity", true),
				});

				return interaction.reply({
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel(`Open ${invite.targetApplication?.name}`)
								.setStyle(ButtonStyle.Link)
								.setURL(invite.toString()),
						),
					],
					ephemeral: true,
				});
			}
			case "sound": {
				if (guild.members.me?.voice.channel)
					return interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.no} I'm already playing something!`,
					});

				const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator,
					selfDeaf: false,
				});

				const player = createAudioPlayer({
					behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
				}).on("error", (error) => {
					connection.disconnect();
					throw error;
				});

				console.log("inited");
				connection
					.on(VoiceConnectionStatus.Ready, () => {
						console.log("ready");

						connection.subscribe(player);
						console.log("subscribed");
						player.play(
							createAudioResource(
								createReadStream(
									path.resolve(
										path.dirname(url.fileURLToPath(import.meta.url)),
										"../../common/audio/biteOf87.ogg",
									),
								),
								{ inputType: StreamType.OggOpus },
							),
						);
						console.log("playing");
						// player.on(AudioPlayerStatus.Idle, connection.disconnect);
					})
					.on(VoiceConnectionStatus.Disconnected, async () => {
						console.log("disconnect?");
						try {
							await Promise.race([
								entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
								entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
							]);
							// Seems to be reconnecting to a new channel - ignore disconnect
						} catch {
							console.log("disconnect");
							// Seems to be a real disconnect which SHOULDN'T be recovered from
							connection.destroy();
							player.stop();
						}
					})
					.on("error", (error) => {
						connection.disconnect();
						throw error;
					});
			}
		}
	},
};
export default info;
