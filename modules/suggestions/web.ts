import { toCodePoints } from "@twemoji/parser";
import {
	Collection,
	channelLink,
	type Attachment,
	type DefaultReactionEmoji,
	type EmbedAssetData,
	type MessageInteraction,
	type Snowflake,
} from "discord.js";
import Mustache from "mustache";
import fileSystem from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { client } from "strife.js";
import config from "../../common/config.js";
import { markdownToHtml } from "../../util/markdown.js";
import { getRequestUrl } from "../../util/text.js";
import { getAnswers, oldSuggestions, suggestionAnswers, suggestionsDatabase } from "./misc.js";
import top from "./top.js";

const TOP_PAGE = await fileSystem.readFile("./modules/suggestions/top.html", "utf8"),
	SUGGESTION_PAGE = await fileSystem.readFile("./modules/suggestions/suggestion.html", "utf8");

export default async function suggestionsPage(
	request: IncomingMessage,
	response: ServerResponse,
	threadId?: Snowflake,
): Promise<ServerResponse> {
	const url = getRequestUrl(request);

	if (!threadId) {
		const all = url.searchParams.has("all");
		const currentPage = Math.max(1, +(url.searchParams.get("page") ?? 1));
		const suggestionsData = await top(undefined, {
			all,
			page: currentPage - 1,
		});
		const embed = suggestionsData?.embeds?.[0];
		const suggestions = embed && "description" in embed && embed.description;
		const pageInfo = embed && "footer" in embed && embed.footer?.text;

		const member = await config.guild.members.fetchMe();
		return response.writeHead(200, { "content-type": "text/html" }).end(
			Mustache.render(TOP_PAGE, {
				member,
				avatar: member.user.displayAvatarURL({ size: 64 }),
				icon: member.roles.icon?.iconURL(),
				content: markdownToHtml(suggestions || ""),
				all: all ? "&all" : "",
				pageInfo,
				previousPage: currentPage - 1,
				nextPage: pageInfo && pageInfo.includes(`/${currentPage}`) ? 0 : currentPage + 1,
			}),
		);
	}

	const thread = await config.guild.channels.fetch(threadId).catch(() => void 0);
	if (
		!thread?.isThread() ||
		!thread.parentId ||
		![config.channels.suggestions?.id, config.channels.oldSuggestions?.id].includes(
			thread.parentId,
		)
	)
		return response.writeHead(308, { location: channelLink(threadId, config.guild.id) }).end();

	const suggestion = [...suggestionsDatabase.data, ...oldSuggestions].find(
		(suggestion): suggestion is Extract<typeof suggestion, { id: Snowflake }> =>
			"id" in suggestion && suggestion.id === thread.id,
	);
	if (!suggestion)
		return response.writeHead(308, { location: channelLink(threadId, config.guild.id) }).end();

	const starterMessage = await thread.fetchStarterMessage().catch(() => void 0);

	const member =
		config.channels.oldSuggestions?.id === thread.parentId
			? await config.guild.members.fetch(suggestion.author.valueOf()).catch(() => ({
					displayHexColor: `#${(starterMessage?.embeds[0]?.color ?? 0)
						.toString(16)
						.padStart(6, "0")}`,
					user: undefined,
					roles: undefined,
			  }))
			: undefined;
	const messages = [
		!starterMessage || config.channels.oldSuggestions?.id === thread.parentId
			? {
					interaction: starterMessage?.interaction,
					createdAt: (starterMessage ?? thread).createdAt,
					id: (starterMessage ?? thread).id,
					attachments: starterMessage?.embeds[0]?.image
						? new Collection<Snowflake, Attachment | EmbedAssetData>([
								...starterMessage.attachments,
								["0", starterMessage.embeds[0].image],
						  ])
						: starterMessage?.attachments,
					content:
						starterMessage?.content ||
						starterMessage?.embeds[0]?.description ||
						(starterMessage?.attachments.size ? "" : `${suggestion.title}`),
					member,
					author:
						member?.user ??
						(typeof suggestion.author === "string"
							? await client.users.fetch(suggestion.author)
							: suggestion.author),
			  }
			: starterMessage,

		...(await thread.messages.fetchPinned())
			.filter(
				(message) =>
					message.id !== starterMessage?.id &&
					(message.content || message.attachments.size),
			)
			.toSorted((one, two) => one.createdTimestamp - two.createdTimestamp)
			.values(),
	];

	const emoji = prepareEmoji(
		!("old" in suggestion) && config.channels.suggestions?.defaultReactionEmoji,
		"👍",
	);

	const answer = (config.channels.suggestions &&
		getAnswers(config.channels.suggestions).find(
			([, tag]) => tag.name === suggestion.answer,
		)?.[1]) ?? { name: suggestionAnswers[0], emoji: undefined };

	const rendered = Mustache.render(SUGGESTION_PAGE, {
		messages,
		suggestion: {
			title: suggestion.title,
			votes: { emoji, count: suggestion.count.toLocaleString() },
			answer: { emoji: prepareEmoji(answer.emoji, "❓"), name: answer.name },
			url: thread.url,
		},
		interactionAvatar(this: MessageInteraction | null | undefined) {
			return this?.user.displayAvatarURL({ size: 64 });
		},
		userAvatar(this: typeof messages[number]) {
			return this.author.displayAvatarURL({ size: 64 });
		},
		userIcon(this: typeof messages[number]) {
			return this.member?.roles?.icon?.iconURL();
		},
		createdDate(this: typeof messages[number]) {
			return this.createdAt?.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
		},
		attachmentArray(this: typeof messages[number]) {
			return Array.from(this.attachments?.values() ?? [], (attachment) => ({
				name: "name" in attachment ? attachment.name : "",
				url: attachment.proxyURL ?? attachment.url,
				height: attachment.height,
				width: attachment.width,
				isImage: !("id" in attachment) || attachment.contentType?.startsWith("image/"),
				isVideo: "id" in attachment && attachment.contentType?.startsWith("video/"),
				isAudio: "id" in attachment && attachment.contentType?.startsWith("audio/"),
			}));
		},
		messageContent(this: typeof messages[number]) {
			return markdownToHtml(this.content);
		},
	});
	return response.writeHead(200, { "content-type": "text/html" }).end(rendered);
}

function prepareEmoji(
	emoji: Partial<DefaultReactionEmoji> | false | null | undefined,
	defaultTwemoji: string,
): { name: string; url: string } {
	if (emoji && emoji.id) {
		return {
			name: `:${emoji.name ?? "_"}:`,
			url: `https://cdn.discordapp.com/emojis/${emoji.id}.webp?size=96&quality=lossless`,
		};
	} else {
		const name = (emoji && emoji.name) || defaultTwemoji;
		const codePoints = toCodePoints(
			name.includes("\u200D") ? name : name.replaceAll("\uFE0F", ""),
		);
		return {
			name: name,
			url: `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints.join(
				"-",
			)}.svg`,
		};
	}
}
