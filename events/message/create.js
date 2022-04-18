)/diu.test(message.content) && !message.author?.bot) {
			promises.push(
				message.reply({
					content: "`r!suggest` has been removed, please use `/suggestion create`.",
				}),
			);
		}

		const content = strip(
			message.content
				.toLowerCase()
				.normalize("NFD")
				.replace(
					/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu,
					"",
				)
				.replace(/<.+?>/, ""),
		);

		/**
		 * Determines whether the message contains a word.
		 *
		 * @param {string | RegExp} text - The word to check for.
		 *
		 * @returns {boolean} Whether the message contains the word.
		 */
		function includes(text, { full = false, plural = true } = {}) {
			return new RegExp(
				(full ? "^" : "\\b") +
					(typeof text === "string" ? text : text.source) +
					(plural ? "(e?s)?" : "") +
					(full ? "$" : "\\b"),
				"i",
			).test(content);
		}

		/**
		 * @param {import("discord.js").EmojiIdentifierResolvable} emoji
		 *
		 * @returns {Promise<void | import("discord.js").MessageReaction> | void}
		 */
		function react(emoji) {
			if (reactions > 2) return;
			reactions++;
			const promise = message.react(emoji).catch((error) => {
				console.error(error);
			});
			promises.push(promise);
			return promise;
		}

		if (includes("dango") || content.includes("🍡")) react("🍡");

		if (includes(/av[ao]cado/) || content.includes("🥑")) react("🥑");

		if (
			content === "e" ||
			(content === "." && message.author.id === "761276793666797589") ||
			content.includes("<:e_:847428533432090665>")
		)
			react(CONSTANTS.emojis.autoreact.e);

		if (includes("quack") || includes("duck") || content.includes("🦆")) react("🦆");

		if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);

		if (includes(/griff(?:patch)?y?'?/)) react(CONSTANTS.emojis.autoreact.griffpatch);

		if (includes("cubot")) react(CONSTANTS.emojis.autoreact.cubot);

		if (message.content.includes("( ^∘^)つ")) react(CONSTANTS.emojis.autoreact.sxd);

		if (includes(/te(?:r|w)+a/)) react(CONSTANTS.emojis.autoreact.tera);

		if (includes("sat on addon")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
			}
		}

		if (includes("snake")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.snakes));
			}
		}

		if (includes(/amon?g ?us/, { plural: false })) react(CONSTANTS.emojis.autoreact.amongus);

		if (includes("sus", { plural: false })) react(CONSTANTS.emojis.autoreact.sus);

		if (
			/gives? ?you ?up/.test(content) ||
			includes("rickroll") ||
			includes(/(?:rick(roll(?:ed|ing))?|dqw4w9wgxcq)/i, { plural: false })
		)
			react(CONSTANTS.emojis.autoreact.rick);

		if (/\b(NO+)+\b/.test(message.content)) react(CONSTANTS.emojis.autoreact.nope);

		if (
			message.mentions.users.has(message.client.user?.id ?? "") &&
			message.mentions.repliedUser?.id !== (message.client.user?.id ?? "")
		)
			react("👋");

		await Promise.all(promises);
	},
};

export default event;
RS.opened);

						const starterMessage = await mailChannel.send({
							allowedMentions: { parse: ["everyone"] },
							content: NODE_ENV === "production" ? "@here" : undefined,

							embeds: [openedEmbed],
						});
						const newThread = await starterMessage.startThread({
							name: `${message.author.username}`,
							autoArchiveDuration: "MAX",
						});

						if (!webhook) throw new ReferenceError("Could not find webhook");

						await Promise.all([
							buttonInteraction.reply({
								content:
									`${CONSTANTS.emojis.statuses.yes} **Modmail ticket opened!** You may send the mod team messages by sending me DMs. I will DM you their messages. ` +
									UNSUPPORTED,

								ephemeral: true,
							}),
							webhook
								.send({
									threadId: newThread.id,
									...(await generateMessage(message)),
								})
								.then(
									async () => await message.react(CONSTANTS.emojis.statuses.yes),
								)
								.catch(async (error) => {
									console.error(error);
									return await message.react(CONSTANTS.emojis.statuses.no);
								}),
						]);
					},
					async (options) => {
						toEdit = await message.reply(options);
						return toEdit;
					},
					(options) => toEdit.edit(options),
				);
				message.channel.createMessageCollector({ time: 30_000 }).on("collect", async () => {
					collector?.stop();
				});
			}
		}

		if (
			message.channel.type === "GUILD_PUBLIC_THREAD" &&
			message.channel.parent?.id === MODMAIL_CHANNEL &&
			!message.content.startsWith("=") &&
			(message.webhookId && message.author.id !== message.client.user?.id
				? (await message.fetchWebhook()).owner?.id !== message.client.user?.id
				: true) &&
			message.interaction?.commandName !== "modmail"
		) {
			const member = await getMemberFromThread(message.channel);

			if (member instanceof GuildMember) {
				const channel =
					member.user.dmChannel ??
					(await member.createDM().catch(async (error) => {
						console.error(error);
						await message.react(CONSTANTS.emojis.statuses.no);
					}));
				const messageToSend = await generateMessage(message);

				messageToSend.content =
					message.author.toString() +
					":" +
					(messageToSend.content ? " " + messageToSend.content : "");

				reactions++;

				promises.push(
					channel
						?.send(messageToSend)
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async (error) => {
							console.error(error);
							return await message.react(CONSTANTS.emojis.statuses.no);
						}),
				);
			}
		}

		const mentions = (
			process.env.NODE_ENV === "production"
				? message.mentions.users.filter(
						(user) => user.id !== message.author.id && !user.bot,
				  )
				: message.mentions.users
		).size;

		if (mentions > 4 && message.member) {
			promises.push(
				warn(message.member, "Please don’t ping so many people!", Math.round(mentions / 5)),
				message.reply({
					content: CONSTANTS.emojis.statuses.no + " Please don’t ping so many people!",
				}),
			);
		}

		if (
			message.type === "THREAD_CREATED" &&
			[process.env.BUGS_CHANNEL, SUGGESTION_CHANNEL].includes(message.channel.id)
		) {
			await Promise.all([...promises, message.delete()]);
			return;
		}

		// Autoactions start here. Return early in some channels.

		if (
			[
				SUGGESTION_CHANNEL,
				process.env.BUGS_CHANNEL,
				BOARD_CHANNEL,
				process.env.LOGS_CHANNEL,
			].includes(message.channel.id)
		) {
			await Promise.all(promises);
			return;
		}

		// eslint-disable-next-line no-irregular-whitespace -- This is intended.
		const spoilerHack = "||​||".repeat(200);

		if (message.content.includes(spoilerHack)) {
			const array = message.content.split(spoilerHack);

			array.shift();
			promises.push(
				message.reply({
					allowedMentions: { users: [] },

					content:
						`You used the spoiler hack to hide: \`\`\`\n` +
						`${Util.cleanCodeBlockContent(array.join(spoilerHack))}\n` +
						`\`\`\``,
				}),
			);
		}

		if (/^r!(?:idea|sg|suggest(?:ion)?(?: |$))/diu.test(message.content) && !message.author?.bot) {
			promises.push(
				message.reply({
					content: "`r!suggest` has been removed, please use `/suggestion create`.",
				}),
			);
		}

		const content = strip(
			message.content
				.toLowerCase()
				.normalize("NFD")
				.replace(
					/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu,
					"",
				)
				.replace(/<.+?>/, ""),
		);

		/**
		 * Determines whether the message contains a word.
		 *
		 * @param {string | RegExp} text - The word to check for.
		 *
		 * @returns {boolean} Whether the message contains the word.
		 */
		function includes(text, { full = false, plural = true } = {}) {
			return new RegExp(
				(full ? "^" : "\\b") +
					(typeof text === "string" ? text : text.source) +
					(plural ? "(e?s)?" : "") +
					(full ? "$" : "\\b"),
				"i",
			).test(content);
		}

		/**
		 * @param {import("discord.js").EmojiIdentifierResolvable} emoji
		 *
		 * @returns {Promise<void | import("discord.js").MessageReaction> | void}
		 */
		function react(emoji) {
			if (reactions > 2) return;
			reactions++;
			const promise = message.react(emoji).catch((error) => {
				console.error(error);
			});
			promises.push(promise);
			return promise;
		}

		if (includes("dango") || content.includes("🍡")) react("🍡");

		if (includes(/av[ao]cado/) || content.includes("🥑")) react("🥑");

		if (
			content === "e" ||
			(content === "." && message.author.id === "761276793666797589") ||
			content.includes("<:e_:847428533432090665>")
		)
			react(CONSTANTS.emojis.autoreact.e);

		if (includes("quack") || includes("duck") || content.includes("🦆")) react("🦆");

		if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);

		if (includes(/griff(?:patch)?y?'?/)) react(CONSTANTS.emojis.autoreact.griffpatch);

		if (includes("cubot")) react(CONSTANTS.emojis.autoreact.cubot);

		if (message.content.includes("( ^∘^)つ")) react(CONSTANTS.emojis.autoreact.sxd);

		if (includes(/te(?:r|w)+a/)) react(CONSTANTS.emojis.autoreact.tera);

		if (includes("sat on addon")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
			}
		}

		if (includes("snake")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.snakes));
			}
		}

		if (includes(/amon?g ?us/, { plural: false })) react(CONSTANTS.emojis.autoreact.amongus);

		if (includes("sus", { plural: false })) react(CONSTANTS.emojis.autoreact.sus);

		if (
			/gives? ?you ?up/.test(content) ||
			includes("rickroll") ||
			includes(/(?:rick(roll(?:ed|ing))?|dqw4w9wgxcq)/i, { plural: false })
		)
			react(CONSTANTS.emojis.autoreact.rick);

		if (/\b(NO+)+\b/.test(message.content)) react(CONSTANTS.emojis.autoreact.nope);

		if (
			message.mentions.users.has(message.client.user?.id ?? "") &&
			message.mentions.repliedUser?.id !== (message.client.user?.id ?? "")
		)
			react("👋");

		await Promise.all(promises);
	},
};

export default event;
