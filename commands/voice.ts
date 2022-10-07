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
	AudioPlayerStatus,
} from "@discordjs/voice";
import type { ChatInputCommand } from "../common/types/command.js";
import { guild } from "../client.js";
import url from "node:url";
import path from "path";
import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/moderation/logging.js";

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
		)
		.addSubcommand((input) =>
			input
				.setName("meme-sound")
				.setDescription("Play a meme sound")
				.addStringOption((input) =>
					input
						.setName("sound")
						.setDescription("The sound to play")
						.setRequired(true)
						.addChoices(
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
							{ name: "Taco Bell", value: "bong.mp3" },
							{ name: "This group is dead", value: "dead.mp3" },
							{ name: "WAS THAT THE BITE OF 87?!?!?", value: "biteOf87.wav" },
							{ name: "Wii", value: "wii.mp3" },
							{ name: "Wut da dog doin?", value: "wutDaDogDoin.mp3" },
							{ name: "YEEEET!", value: "yeet.mp3" },
							{ name: "Yoshi", value: "yoshi.mp3" },
						),
				)
				.addChannelOption((input) =>
					input
						.setName("channel")
						.setDescription("The channel to play the sound in")
						.addChannelTypes(ChannelType.GuildVoice),
				),
		)
		.addSubcommand((input) =>
			input
				.setName("quote-sound")
				.setDescription("Play a quote sound")
				.addStringOption((input) =>
					input
						.setName("sound")
						.setDescription("The sound to play")
						.setRequired(true)
						.addChoices(
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
						),
				)
				.addChannelOption((input) =>
					input
						.setName("channel")
						.setDescription("The channel to play the sound in")
						.addChannelTypes(ChannelType.GuildVoice),
				),
		),

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
			case "meme-sound":
			case "quote-sound": {
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
				connection.subscribe(player);
				player.play(
					createAudioResource(
						path.resolve(
							path.dirname(url.fileURLToPath(import.meta.url)),
							`../../common/audio/${interaction.options.getString("sound", true)}`,
						),
					),
				);
				player.on(AudioPlayerStatus.Idle, () => connection.disconnect());

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
							player.stop();
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

export default info;
