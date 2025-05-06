import type { IncomingMessage, ServerResponse } from "node:http";
import type {
	RESTGetAPICurrentUserResult,
	RESTPostOAuth2AccessTokenResult,
	RESTPostOAuth2AccessTokenURLEncodedData,
	RESTPostOAuth2RefreshTokenResult,
	RESTPostOAuth2RefreshTokenURLEncodedData,
	RESTPutAPICurrentUserApplicationRoleConnectionJSONBody,
	RESTPutAPICurrentUserApplicationRoleConnectionResult,
} from "discord.js";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { ApplicationRoleConnectionMetadataType, OAuth2Scopes, Routes } from "discord.js";
import { client } from "strife.js";

import { fetchUser } from "../../util/scratch.ts";
import { getRequestUrl } from "../../util/text.ts";

await client.application.editRoleConnectionMetadataRecords([
	{
		key: "joined",
		name: "Joined",
		description: "Days since joining Scratch",
		type: ApplicationRoleConnectionMetadataType.DatetimeGreaterThanOrEqual,
	},
]);

export default async function linkScratchRole(
	request: IncomingMessage,
	response: ServerResponse,
): Promise<ServerResponse> {
	if (!process.env.CLIENT_SECRET)
		return response.writeHead(501, { "content-type": "text/plain" }).end("501 Not Implemented");
	if (request.method === "OPTIONS")
		return response.writeHead(201, { "content-type": "text/plain" }).end("201 No Content");

	const requestUrl = getRequestUrl(request);
	const redirectUri = requestUrl.origin + requestUrl.pathname;
	const discordUrl = `https://discord.com${Routes.oauth2Authorization()}?${new URLSearchParams({
		client_id: client.user.id,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: `${OAuth2Scopes.Identify} ${OAuth2Scopes.RoleConnectionsWrite}`,
	}).toString()}`;
	// eslint-disable-next-line unicorn/string-content
	const discordHtml = `<meta http-equiv="refresh" content="0;url=${discordUrl}">`;

	const search = new URLSearchParams(requestUrl.search);
	const scratchToken = search.get("privateCode");
	if (!scratchToken) {
		const code = search.get("code");
		if (!code) return response.writeHead(303, { location: discordUrl }).end();

		const tokenData = (await client.rest
			.post(Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					redirect_uri: redirectUri,
					client_id: client.user.id,
					client_secret: process.env.CLIENT_SECRET,
					grant_type: "authorization_code",
					code,
				} satisfies RESTPostOAuth2AccessTokenURLEncodedData),
				passThroughBody: true,
				headers: { "content-type": "application/x-www-form-urlencoded" },
				auth: false,
			})
			.catch(() => void 0)) as RESTPostOAuth2AccessTokenResult | undefined;
		if (!tokenData)
			return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);

		return response.writeHead(303, { location: getScratchUrl(tokenData.refresh_token) }).end();
	}

	const rawToken = search.get("refresh_token");
	const discordToken = rawToken && decodeString(rawToken);
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
	).then((verification) => verification.json() as Promise<{ username: string | null }>);
	const scratch = username && (await fetchUser(username));
	if (!scratch)
		return response.writeHead(401, { "content-type": "text/html" }).end(
			// eslint-disable-next-line unicorn/string-content
			`<meta http-equiv="refresh" content="0;url=${getScratchUrl(tokenData.refresh_token)}">`,
		);

	(await client.rest.put(Routes.userApplicationRoleConnection(client.user.id), {
		body: JSON.stringify({
			platform_name: "Scratch",
			platform_username: username,
			metadata: { joined: scratch.history.joined.split("T")[0] },
		} satisfies RESTPutAPICurrentUserApplicationRoleConnectionJSONBody),
		passThroughBody: true,
		headers: {
			"authorization": `${tokenData.token_type} ${tokenData.access_token}`,
			"content-type": "application/json",
		},
		auth: false,
	})) as RESTPutAPICurrentUserApplicationRoleConnectionResult;

	(await client.rest.get(Routes.user(), {
		headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
		auth: false,
	})) as RESTGetAPICurrentUserResult;
	return response
		.writeHead(200, { "content-type": "text/html" })
		.end("<script>window.close();</script>");

	function getScratchUrl(refreshToken: string): string {
		const encodedRedirectUri = Buffer.from(
			`${redirectUri}?refresh_token=${encodeString(refreshToken)}`,
		).toString("base64");
		return `https://auth.itinerary.eu.org/auth/?name=${encodeURIComponent(
			client.user.displayName,
		)}&redirect=${encodedRedirectUri}`;
	}
}

const secretKey = randomBytes(32);
function encodeString(text: string): string {
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-256-cbc", secretKey, iv);
	const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
	return `${iv.toString("hex")}:${encrypted}`;
}

// Decode the string
function decodeString(encryptedText: string): string | undefined {
	try {
		const parts = encryptedText.split(":");
		const iv = Buffer.from(parts.shift() ?? "", "hex");
		const decipher = createDecipheriv("aes-256-cbc", secretKey, iv);
		return decipher.update(parts.join(":"), "hex", "utf8") + decipher.final("utf8");
		// eslint-disable-next-line no-empty
	} catch {}
}
