import {
	ApplicationRoleConnectionMetadataType,
	Routes,
	type RESTPostOAuth2AccessTokenURLEncodedData,
	type RESTPostOAuth2AccessTokenResult,
	type RESTPostOAuth2RefreshTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenResult,
	OAuth2Scopes,
	type RESTPutAPICurrentUserApplicationRoleConnectionJSONBody,
	type RESTPutAPICurrentUserApplicationRoleConnectionResult,
	type RESTGetAPICurrentUserResult,
	userMention,
} from "discord.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { client } from "strife.js";
import fileSystem from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { fetchUser } from "../../util/scratch.js";
import { getRequestUrl } from "../../util/text.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import { handleUser } from "../auto/scratch.js";

await client.application.editRoleConnectionMetadataRecords([
	{
		key: "joined",
		name: "Joined",
		description: "Days since joining Scratch",
		type: ApplicationRoleConnectionMetadataType.DatetimeGreaterThanOrEqual,
	},
]);

const NOT_FOUND_PAGE = await fileSystem.readFile("./web/404.html", "utf8");

const HASH = randomBytes(16);
const sessions: Record<string, string> = {};
export default async function linkScratchRole(
	request: IncomingMessage,
	response: ServerResponse,
): Promise<ServerResponse> {
	if (!process.env.CLIENT_SECRET)
		return response.writeHead(503, { "content-type": "text/html" }).end(NOT_FOUND_PAGE);

	const ipHash = createHash("sha384")
		.update(request.socket.remoteAddress ?? "")
		.update(HASH)
		.digest("base64");

	const requestUrl = getRequestUrl(request);
	const redirectUri = requestUrl.origin + requestUrl.pathname;
	const discordUrl = `https://discord.com${Routes.oauth2Authorization()}?${new URLSearchParams({
		client_id: client.user.id,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: OAuth2Scopes.Identify + " " + OAuth2Scopes.RoleConnectionsWrite,
	}).toString()}`;
	const scratchUrl = `https://auth.itinerary.eu.org/auth/?name=${encodeURIComponent(
		client.user.displayName,
	)}&redirect=${Buffer.from(redirectUri).toString("base64")}`;
	const discordHtml = `<meta http-equiv="refresh" content="0;url=${discordUrl}">`; // eslint-disable-line unicorn/string-content
	const scratchHtml = `<meta http-equiv="refresh" content="0;url=${scratchUrl}">`; // eslint-disable-line unicorn/string-content

	const search = new URLSearchParams(requestUrl.search);
	const scratchToken = search.get("privateCode");
	if (!scratchToken) {
		const code = search.get("code");
		if (!code) return response.writeHead(303, { location: discordUrl }).end();

		const tokenData = (await client.rest
			.post(Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					client_id: client.user.id,
					client_secret: process.env.CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
					redirect_uri: redirectUri,
				} satisfies RESTPostOAuth2AccessTokenURLEncodedData),
				passThroughBody: true,
				headers: { "content-type": "application/x-www-form-urlencoded" },
				auth: false,
			})
			.catch(() => void 0)) as RESTPostOAuth2AccessTokenResult | undefined;
		if (!tokenData)
			return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);

		sessions[ipHash] = tokenData.refresh_token;

		return response.writeHead(303, { location: scratchUrl }).end();
	}

	const discordToken = sessions[ipHash];
	if (!discordToken)
		return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);
	const tokenData = (await client.rest
		.post(Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				client_id: client.user.id,
				client_secret: process.env.CLIENT_SECRET,
				grant_type: "refresh_token",
				refresh_token: discordToken,
			} satisfies RESTPostOAuth2RefreshTokenURLEncodedData),
			passThroughBody: true,
			headers: { "content-type": "application/x-www-form-urlencoded" },
			auth: false,
		})
		.catch(() => void 0)) as RESTPostOAuth2RefreshTokenResult | undefined;
	if (!tokenData)
		return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);

	const { username } = await fetch(
		`https://auth-api.itinerary.eu.org/auth/verifyToken/${encodeURI(scratchToken)}`,
	).then((response) => response.json<{ username: string | null }>());
	const scratch = username && (await fetchUser(username));
	if (!scratch) return response.writeHead(401, { "content-type": "text/html" }).end(scratchHtml);

	(await client.rest.put(Routes.userApplicationRoleConnection(client.user.id), {
		body: JSON.stringify({
			platform_name: "Scratch",
			platform_username: username,
			metadata: {
				joined: ("joined" in scratch ? scratch.joined : scratch.history.joined).split(
					"T",
				)[0],
			},
		} satisfies RESTPutAPICurrentUserApplicationRoleConnectionJSONBody),
		passThroughBody: true,
		headers: {
			"authorization": `${tokenData.token_type} ${tokenData.access_token}`,
			"content-type": "application/json",
		},
		auth: false,
	})) as RESTPutAPICurrentUserApplicationRoleConnectionResult;

	const user = (await client.rest.get(Routes.user(), {
		headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
		auth: false,
	})) as RESTGetAPICurrentUserResult;
	await log(
		`${LoggingEmojis.Integration} ${userMention(
			user.id,
		)} linked their Scratch account [${username}](${constants.urls.scratch}/users/${username})`,
		LogSeverity.ServerChange,
		{ embeds: [await handleUser(["", "", username])] },
	);
	return response.writeHead(303, { location: config.guild.rulesChannel?.url }).end();
}
