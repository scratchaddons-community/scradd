import {
	Routes,
	type RESTPostOAuth2AccessTokenResult,
	type RESTGetAPICurrentUserResult,
	type RESTPostOAuth2AccessTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenResult,
} from "discord.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { client } from "strife.js";
import fileSystem from "node:fs/promises";

const APPEAL_PAGE = await fileSystem.readFile("./web/appeal.html", "utf8");

export default async function showAppeal(request: IncomingMessage, response: ServerResponse) {
	if (!process.env.CLIENT_SECRET)
		return response.writeHead(404, { "content-type": "text/plain" }).end("Not Found");

	const requestUrl = new URL(
		request.url ?? "",
		`http${"encrypted" in request.socket ? "s" : ""}://${request.headers.host}`,
	);
	const code = new URLSearchParams(requestUrl.search).get("code");
	const redirectUri = requestUrl.origin + requestUrl.pathname;

	const tokenData =
		code &&
		((await client.rest
			.post(Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					client_id: client.user.id,
					client_secret: process.env.CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
				} satisfies RESTPostOAuth2AccessTokenURLEncodedData),
				passThroughBody: true,
				headers: { "content-type": "application/x-www-form-urlencoded" },
				auth: false,
			})
			.catch(() => void 0)) as RESTPostOAuth2AccessTokenResult | undefined);
	if (!tokenData)
		return response
			.writeHead(302, {
				location: `https://discord.com/oauth2/authorize?client_id=${client.user.id}&redirect_uri=${redirectUri}&response_type=code&scope=identify`,
			})
			.end();

	const user = (await client.rest.get(Routes.user(), {
		headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
		auth: false,
	})) as RESTGetAPICurrentUserResult;

	response
		.writeHead(200, { "content-type": "text/html" })
		.end(
			APPEAL_PAGE.replaceAll("{username}", user.global_name ?? user.username).replaceAll(
				"{token}",
				tokenData.refresh_token,
			),
		);
}

export async function appeal(request: IncomingMessage, response: ServerResponse) {
	if (!process.env.CLIENT_SECRET)
		return response.writeHead(404, { "content-type": "text/plain" }).end("Not Found");

	const chunks: Buffer[] = [];
	request.on("data", (chunk: Buffer) => chunks.push(chunk));
	await new Promise((resolve) => request.on("end", resolve));
	const body = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
	const refreshToken = body.get("token");

	const tokenData =
		refreshToken &&
		((await client.rest
			.post(Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					client_id: client.user.id,
					client_secret: process.env.CLIENT_SECRET,
					grant_type: "refresh_token",
					refresh_token: refreshToken,
				} satisfies RESTPostOAuth2RefreshTokenURLEncodedData),
				passThroughBody: true,
				headers: { "content-type": "application/x-www-form-urlencoded" },
				auth: false,
			})
			.catch(() => void 0)) as RESTPostOAuth2RefreshTokenResult | undefined);
	if (!tokenData) return; // todo

	const user = (await client.rest.get(Routes.user(), {
		headers: {
			authorization: `${tokenData.token_type} ${tokenData.access_token}`,
		},
		auth: false,
	})) as RESTGetAPICurrentUserResult;
}
