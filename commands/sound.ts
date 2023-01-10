import url from "node:url";
import path from "path";

import {
	joinVoiceChannel,
	VoiceConnectionStatus,
	entersState,
	createAudioPlayer,
	NoSubscriberBehavior,
	createAudioResource,
	AudioPlayerStatus,
} from "@discordjs/voice";
import { ApplicationCommandOptionType, ChannelType, GuildMember, VoiceChannel } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";
import { defineCommand } from "../common/types/command.js";

const command = defineCommand({
	data: {
		description: "Commands to play sounds in voice channels",

		subcommands: {
			meme: {
				description: "Play a meme sound",

				options: {
					sound: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The sound to play",

						choices: {
							"amongus.mp3": "AMONGUS",
							"youreWelcome.mp3": "And thank you!",
							"bigChungus.mp3": "Big Big Chungus (big chungus, big chungus)",
							"breh.mp3": "breuh",
							"crabRave.mp3": "Crab Rave",
							"creeper.mp3": "Creeper? Awww, man",
							"e.mp3": "E",
							"emotionalDamage.mp3": "E-mo-tion-al dam-age",
							"fbi.mp3": "FBI OPEN UP",
							"rickroll.mp3": "Innocent song",
							"weGotEm.mp3": "Ladies and Gentlemen, we got 'em!",
							"megalovania.mp3": "Megalovania",
							"nani.mp3": "NANI?!",
							"nowThatsALottaDamage.m4a": "Now that's a lotta damage!",
							"oof.mp3": "oof",
							"discord.mp3": "Ping!1!!1!!!",
							"allStar.mp3": "Somebody once told me",
							"yoshi.mp3": "Stardew Valley",
							"bong.mp3": "Taco Bell",
							"dead.mp3": "This group is dead",
							"biteOf87.wav": "WAS THAT THE BITE OF 87?!?!?",
							"wii.mp3": "Wii",
							"wutDaDogDoin.mp3": "Wut da dog doin?",
							"yeet.mp3": "YEEEET!",
						},
					},

					channel: {
						channelTypes: [ChannelType.GuildVoice],
						description: "The channel to play the sound in",
						type: ApplicationCommandOptionType.Channel,
					},
				},
			},

			quote: {
				description: "Play a quote sound",

				options: {
					sound: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The sound to play",

						choices: {
							"colaberVoiceReveal.wav": "And then, Colaber, voice revealed",
							"squidward.mp3": "Co-Lay-Burrrr",
							"colaber.mp3": "ColaberColaberColaber",
							"iFeelGood.wav": "I Feel Good",
							"chips.mp3": "nom nom nom",
							"notTodayGriffpatch.mp3": "Not Today, Griffpatch",
							"potato.mp3": "poe-tah-toe",
							"ping.mp3": "Scratch Notifier",
							"worldsSmallestViolin.wav": "The World's Smallest Violin",
							"thisIs.mp3": "This Is Scratch Addons.",
							"weGottaGetRedGuyBack.mp3": "We gotta get Red Guy back!",
							"tedTalk.wav": "TED Talk",
							"balls.wav": "We've got some REALLY good content today, though.",
							"welcomeBack.mp3": "Welcome back to the Scratch Addons YouTube channel",
						},
					},

					channel: {
						type: ApplicationCommandOptionType.Channel,
						description: "The channel to play the sound in",
						channelTypes: [ChannelType.GuildVoice],
					},
				},
			},
		},
	},

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");

		const sound = interaction.options.getString("sound", true);

		const channel = [
			interaction.options.getChannel("channel"),
			interaction.channel,
			interaction.member.voice.channel,
		].find((channel): channel is VoiceChannel => channel instanceof VoiceChannel);

		if (!channel) {
			return await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Please select or join a voice channel!`,
				ephemeral: true,
			});
		}

		if (CONSTANTS.guild.members.me?.voice.channel) {
			return await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} I'm already playing something!`,
				ephemeral: true,
			});
		}

		const connection = joinVoiceChannel({
			adapterCreator: channel.guild.voiceAdapterCreator,
			channelId: channel.id,
			guildId: channel.guild.id,
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
					`../../common/audio/${sound}`,
				),
			),
		);
		player.on(AudioPlayerStatus.Idle, () => {
			connection.destroy();
		});

		connection
			.on(VoiceConnectionStatus.Disconnected, () => {
				Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]).catch(() => {
					// Seems to be a real disconnect which SHOULDN'T be recovered from
					connection.destroy();
				});

				// Seems to be reconnecting to a new channel - ignore disconnect
			})
			.on("error", (error) => {
				player.stop();
				throw error;
			});

		await Promise.all([
			interaction.reply(CONSTANTS.emojis.statuses.yes),
			log(
				`🎤 ${interaction.user.toString()} played \`${sound}\` in ${channel.toString()}!`,
				"voice",
			),
		]);
	},
});

export default command;
