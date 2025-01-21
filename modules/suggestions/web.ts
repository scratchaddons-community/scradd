import type { IncomingMessage, ServerResponse } from "node:http";
import type { DefaultReactionEmoji, Snowflake } from "discord.js";

import fileSystem from "node:fs/promises";

import { channelLink } from "discord.js";
import Mustache from "mustache";
import { client } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { getTwemojiUrl, markdownToHtml } from "../../util/markdown.ts";
import { getRequestUrl } from "../../util/text.ts";
import suggestions, { parseSuggestionTags, suggestionAnswers } from "./misc.ts";
import top from "./top.ts";

const TOP_PAGE = await fileSystem.readFile("./modules/suggestions/top.html", "utf8");
const SUGGESTION_PAGE = await fileSystem.readFile("./modules/suggestions/suggestion.html", "utf8");

export default async function suggestionsPage(
	request: IncomingMessage,
	response: ServerResponse,
	threadId?: Snowflake,
): Promise<ServerResponse> {
	const url = getRequestUrl(request);

	if (!threadId) {
		const currentPage = Math.max(1, +(url.searchParams.get("page") ?? 1));
		const { list, pageInfo } = top(currentPage - 1);

		const member = await config.guild.members.fetchMe();
		return response.writeHead(200, { "content-type": "text/html" }).end(
			Mustache.render(TOP_PAGE, {
				member,
				avatar: member.user.displayAvatarURL({ size: 64 }),
				icon: member.roles.icon?.iconURL(),
				content: markdownToHtml(list),
				pageInfo,
				previousPage: currentPage - 1,
				nextPage: pageInfo.includes(`/${currentPage} `) ? 0 : currentPage + 1,
			}),
		);
	}

	const suggestion = suggestions.find(
		(suggestion): suggestion is Extract<typeof suggestion, { id: Snowflake }> =>
			"id" in suggestion && suggestion.id === threadId,
	);
	if (!suggestion)
		return response.writeHead(308, { location: channelLink(threadId, config.guild.id) }).end();

	const thread = await config.guild.channels.fetch(suggestion.id).catch(() => void 0);
	if (!thread?.isThread())
		return response.writeHead(308, { location: channelLink(threadId, config.guild.id) }).end();

	const starterMessage = await thread.fetchStarterMessage().catch(() => void 0);

	const member =
		"old" in suggestion ?
			await thread.guild.members.fetch(suggestion.author.valueOf()).catch(() => ({
				displayHexColor: `#${(starterMessage?.embeds[0]?.color ?? 0)
					.toString(16)
					.padStart(6, "0")}`,
				user: undefined,
				roles: undefined,
			}))
		:	undefined;
	const messages = [
		!starterMessage || "old" in suggestion ?
			{
				createdAt: (starterMessage ?? thread).createdAt,
				id: (starterMessage ?? thread).id,
				attachments: starterMessage?.attachments,
				embeds: starterMessage?.embeds,
				content:
					starterMessage?.content ||
					starterMessage?.embeds[0]?.description ||
					(starterMessage?.attachments.size ? "" : suggestion.title.toString()),
				member,
				author:
					member?.user ??
					(typeof suggestion.author === "string" ?
						await client.users.fetch(suggestion.author)
					:	suggestion.author),
			}
		:	starterMessage,

		...(await thread.messages.fetchPinned())
			.filter(
				(message) =>
					message.id !== starterMessage?.id &&
					(message.content ||
						message.attachments.size ||
						message.interaction?.commandName === "addon"),
			)
			.sorted((one, two) => one.createdTimestamp - two.createdTimestamp)
			.values(),
	];

	const emoji = prepareEmoji(
		!("old" in suggestion) && config.channels.suggestions?.defaultReactionEmoji,
	);

	const { answer } = parseSuggestionTags(
		thread.appliedTags,
		config.channels.suggestions?.availableTags ?? [],
		suggestionAnswers[0],
	);

	const rendered = Mustache.render(SUGGESTION_PAGE, {
		messages,
		suggestion: {
			title: suggestion.title,
			votes: { emoji, count: suggestion.count.toLocaleString() },
			answer: {
				emoji: prepareEmoji(answer.emoji),
				name: answer.name,
				description:
					config.channels.suggestions?.topic
						?.split(`\n- **${answer.name}**: `)[1]
						?.split("\n")[0] ?? "",
			},
			url: thread.url,
		},
		userAvatar(this: (typeof messages)[number]) {
			return this.author.displayAvatarURL({ size: 64 });
		},
		createdDate(this: (typeof messages)[number]) {
			return this.createdAt?.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
		},
		attachmentArray(this: (typeof messages)[number]) {
			const embedImages = Array.from(this.embeds ?? [], (attachment) =>
				attachment.video ?
					{
						name: attachment.title,
						url: attachment.video.proxyURL ?? attachment.video.url,
						height: attachment.video.height,
						width: attachment.video.width,
						isImage: false,
						isVideo: true,
						isAudio: false,
					}
				: attachment.thumbnail ?
					{
						name: attachment.title,
						url: attachment.thumbnail.proxyURL ?? attachment.thumbnail.url,
						height: attachment.thumbnail.height,
						width: attachment.thumbnail.width,
						isImage: true,
						isVideo: false,
						isAudio: false,
					}
				: attachment.image ?
					{
						name: attachment.title,
						url: attachment.image.proxyURL ?? attachment.image.url,
						height: attachment.image.height,
						width: attachment.image.width,
						isImage: true,
						isVideo: false,
						isAudio: false,
					}
				:	undefined,
			);
			return [
				...Array.from(this.attachments?.values() ?? [], (attachment) => ({
					name: attachment.name,
					url: attachment.proxyURL,
					height: attachment.height,
					width: attachment.width,
					isImage: attachment.contentType?.startsWith("image/"),
					isVideo: attachment.contentType?.startsWith("video/"),
					isAudio: attachment.contentType?.startsWith("audio/"),
				})),
				...embedImages.filter(Boolean),
			];
		},
		messageContent(this: (typeof messages)[number]) {
			return markdownToHtml(
				this.content ||
					("interaction" in this &&
						this.interaction?.commandName === "addon" &&
						this.embeds[0] &&
						`## ${this.embeds[0].title ?? ""}\n${this.embeds[0].description ?? ""}\n${
							this.embeds[0].footer?.text ?
								`[Enable Addon](${constants.urls.settings}#addon-${this.embeds[0].footer.text})`
							:	""
						}`) ||
					"",
			);
		},
	});
	return response.writeHead(200, { "content-type": "text/html" }).end(rendered);
}

function prepareEmoji(emoji?: Partial<DefaultReactionEmoji> | false | null): {
	name: string;
	url: string;
} {
	if (emoji && emoji.id)
		return {
			name: `:${emoji.name ?? "emoji"}:`,
			url: client.rest.cdn.emoji(emoji.id, { size: 32 }),
		};

	const name = (emoji && emoji.name) || "👍";
	return { name, url: getTwemojiUrl(name) };
}
