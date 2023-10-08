import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import logError from "../modules/logging/errors.js";
import fileSystem from "node:fs/promises";
import { client } from "strife.js";
import {
	REST,
	Routes,
	type RESTPostOAuth2AccessTokenResult,
	type RESTGetAPICurrentUserResult,
} from "discord.js";

const PAGES = {
	appeal: await fileSystem.readFile("./web/appeal.html", "utf8"),
	css: await fileSystem.readFile("./web/style.css"),
};

const rest = new REST({ version: "10" });
http.createServer(async (request, response) => {
	try {
		const requestUrl = new URL(
			request.url ?? "",
			`http${"encrypted" in request.socket ? "s" : ""}://${request.headers.host}`,
		);

		switch (requestUrl.pathname) {
			case "/clean-database-listeners":
			case "/clean-database-listeners/": {
				if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
					response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");

				process.emitWarning("cleanDatabaseListeners called");
				await cleanDatabaseListeners();
				process.emitWarning("cleanDatabaseListeners ran");
				response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");

				break;
			}
			case "/ban-appeal":
			case "/ban-appeal/": {
				if (!process.env.CLIENT_SECRET)
					return response
						.writeHead(500, { "Content-Type": "text/plain" })
						.end("No client secret provided");

				const code = new URLSearchParams(requestUrl.search).get("code");
				if (!code)
					return response
						.writeHead(404, { "Content-Type": "text/plain" })
						.end("Not Found"); // TODO: redirect to Discord

				const tokenData = (await rest.post(Routes.oauth2TokenExchange(), {
					body: new URLSearchParams({
						client_id: client.user.id,
						client_secret: process.env.CLIENT_SECRET,
						code,
						grant_type: "authorization_code",
						redirect_uri: requestUrl.origin + requestUrl.pathname,
						scope: "identify",
					}),
					passThroughBody: true,
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					auth: false,
				})) as RESTPostOAuth2AccessTokenResult;
				const user = (await rest.get(Routes.user(), {
					headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
					auth: false,
				})) as RESTGetAPICurrentUserResult;

				response
					.writeHead(200, { "Content-Type": "text/html" })
					.end(PAGES.appeal.replaceAll("{username}", user.global_name ?? user.username));
				break;
			}
			case "/style.css": {
				response.writeHead(200, { "Content-Type": "text/css" }).end(PAGES.css);
				break;
			}
			default: {
				response.writeHead(404, { "Content-Type": "text/plain" }).end("Not Found");
			}
		}
	} catch (error) {
		response.writeHead(500).end("Internal Server Error");
		await logError(error, request.url ?? "");
	}
}).listen(process.env.PORT, () => {
	console.log("Server up!");
});
