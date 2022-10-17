import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	InviteTargetType,
	VoiceChannel,
} from "discord.js";
import {
	joinVoiceChannel,
	VoiceConnectionStatus,
	entersState,
	createAudioPlayer,
	NoSubscriberBehavior,
	createAudioResource,
	AudioPlayerStatus,
} from "@discordjs/voice";
import type { ChatInputCommand } from "../common/types/command.js";
import url from "node:url";
import path from "path";
import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/moderation/logging.js";

const command: ChatInputCommand = {
	data: {
		description: "Voice channel commands",
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "activity",
				description: "Start an activity",
				options: [
					{
						required: true,
						type: ApplicationCommandOptionType.String,
						name: "activity",
						description: "The activity to start",
						choices: [
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
						],
					},
					{
						type: ApplicationCommandOptionType.Channel,
						name: "channel",
						description: "The channel to start the activity in",
						channel_types: [ChannelType.GuildVoice],
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "meme-sound",
				description: "Play a meme sound",
				options: [
					{
						required: true,
						type: ApplicationCommandOptionType.String,
						name: "sound",
						description: "The sound to play",
						choices: [
							{ name: "AMONGUS", value: "amongus.mp3" },
							{ name: "And thank you!", value: "youreWelcome.mp3" },
							{
								name: "Big Big Chungus (big chungus, big chungus)",
								value: "bigChungus.mp3",
							},
							{ name: "breuh", value: "breh.mp3" },
							{ name: "Crab Rave", value: "crabRave.mp3" },
							{ name: "Creeper? Awww, man", value: "creeper.mp3" },
							{ name: "E", value: "e.mp3" },
							{ name: "E-mo-tion-al dam-age", value: "emotionalDamage.mp3" },
							{ name: "FBI OPEN UP", value: "fbi.mp3" },
							{ name: "Innocent song", value: "rickroll.mp3" },
							{ name: "Ladies and Gentlemen, we got 'em!", value: "weGotEm.mp3" },
							{ name: "Megalovania", value: "megalovania.mp3" },
							{ name: "NANI?!", value: "nani.mp3" },
							{
								name: "Now that's a lotta damage!",
								value: "nowThatsALottaDamage.m4a",
							},
							{ name: "oof", value: "oof.mp3" },
							{ name: "Ping!1!!1!!!", value: "discord.mp3" },
							{ name: "Somebody once told me", value: "allStar.mp3" },
							{ name: "Stardew Valley", value: "yoshi.mp3" },
							{ name: "Taco Bell", value: "bong.mp3" },
							{ name: "This group is dead", value: "dead.mp3" },
							{ name: "WAS THAT THE BITE OF 87?!?!?", value: "biteOf87.wav" },
							{ name: "Wii", value: "wii.mp3" },
							{ name: "Wut da dog doin?", value: "wutDaDogDoin.mp3" },
							{ name: "YEEEET!", value: "yeet.mp3" },
						],
					},
					{
						type: ApplicationCommandOptionType.Channel,
						name: "channel",
						description: "The channel to play the sound in",
						channel_types: [ChannelType.GuildVoice],
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "quote-sound",
				description: "Play a quote sound",
				options: [
					{
						required: true,
						type: ApplicationCommandOptionType.String,
						name: "sound",
						description: "The sound to play",
						choices: [
							{
								name: "And then, Colaber, voice revealed",
								value: "colaberVoiceReveal.wav",
							},
							{ name: "Co-Lay-Burrrr", value: "squidward.mp3" },
							{ name: "ColaberColaberColaber", value: "colaber.mp3" },
							{ name: "I Feel Good", value: "iFeelGood.wav" },
							{ name: "nom nom nom", value: "chips.mp3" },
							{ name: "Not Today, Griffpatch", value: "notTodayGriffpatch.mp3" },
							{ name: "poe-tah-toe", value: "potato.mp3" },
							{ name: "Scratch Notifier", value: "ping.mp3" },
							{
								name: "The World's Smallest Violin",
								value: "worldsSmallestViolin.wav",
							},
							{ name: "This Is Scratch Addons.", value: "thisIs.mp3" },
							{
								name: "We gotta get Red Guy back!",
								value: "weGottaGetRedGuyBack.mp3",
							},
							{ name: "TED Talk", value: "tedTalk.wav" },
							{
								name: "We've got some REALLY good content today, though.",
								value: "balls.wav",
							},
							{
								name: "Welcome back to the Scratch Addons YouTube channel",
								value: "welcomeBack.mp3",
							},
						],
					},
					{
						type: ApplicationCommandOptionType.Channel,
						name: "channel",
						description: "The channel to play the sound in",
						channel_types: [ChannelType.GuildVoice],
					},
				],
			},
		],
	},

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
					reason: "Starting activity",
				});

				return interaction.reply({
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: `Open ${invite.targetApplication?.name}`,
									style: ButtonStyle.Link,
									url: invite.toString(),
								},
							],
						},
					],
				});
			}
			case "meme-sound":
			case "quote-sound": {
				if (CONSTANTS.guild.members.me?.voice.channel)
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
					connection.destroy();
					throw error;
				});
				connection.subscribe(player);
				player.play(
					createAudioResource(
						path.resolve(
							path.dirname(url.fileURLToPath(import.meta.url)),
							`../../common/audio/${interaction.options.getString("sound", true)}`,
						),
					),
				);
				player.on(AudioPlayerStatus.Idle, () => connection.destroy());

				connection
					.on(VoiceConnectionStatus.Disconnected, async () => {
						try {
							await Promise.race([
								entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
								entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
							]);
							// Seems to be reconnecting to a new channel - ignore disconnect
						} catch {
							// Seems to be a real disconnect which SHOULDN'T be recovered from
							connection.destroy();
						}
					})
					.on("error", (error) => {
						player.stop();
						throw error;
					});

				await Promise.all([
					interaction.reply(CONSTANTS.emojis.statuses.yes),
					log(
						`🎤 ${interaction.user.toString()} used \`${interaction?.toString()}\` in ${channel.toString()}!`,
						"voice",
					),
				]);
			}
		}
	},
};

export default command;
