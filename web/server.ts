import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import logError from "../modules/logging/errors.js";
import fileSystem from "node:fs/promises";
import { client } from "strife.js";

http.createServer(async (request, response) => {
	try {
		const requestUrl = new URL(request.url ?? "", `https://${request.headers.host}`);

		switch (requestUrl.pathname) {
			case "/clean-database-listeners": {
				if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
					response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");

				process.emitWarning("cleanDatabaseListeners called");
				await cleanDatabaseListeners();
				process.emitWarning("cleanDatabaseListeners ran");
				response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");

				break;
			}
			case "/appeal": {
				const code = new URLSearchParams(new URL(request.url ?? "").search).get("code");
				if (!code) return;

				const tokenResponseData = await (
					await fetch("https://discord.com/api/oauth2/token", {
						method: "POST",
						body: new URLSearchParams({
							client_id: "929928324959055932",
							client_secret: "",
							code,
							grant_type: "authorization_code",
							redirect_uri: "https://sa-discord.up.railway.app/appeal",
							scope: "identify",
						}).toString(),
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
					})
				).json();
				const token_type: string = (tokenResponseData as any)?.token_type;
				const access_token: string = (tokenResponseData as any)?.access_token;
				if (!access_token) {
					response
						.writeHead(503, { "Content-Type": "text/plain" })
						.end("Verification Failed");
				}

				const user = await (
					await fetch("https://discord.com/api/users/@me", {
						headers: {
							authorization: `${token_type} ${access_token}`,
						},
					})
				).json();
				const userId: string = (user as any)?.id;
				if (!userId)
					response
						.writeHead(503, { "Content-Type": "text/plain" })
						.end("Verification Failed");

				const bannedUser = (await client.users.fetch(userId).catch(() => void 0)) || {
					username: "",
				};
				const html = await fileSystem.readFile("./appeal/appeal.html", "utf8");
				response
					.writeHead(200, { "Content-Type": "text/html" })
					.end(html.replaceAll("{username}", (bannedUser as any)?.username || ""));
				break;
			}
			case "/appeal.css": {
				const css = await fileSystem.readFile("./appeal/appeal.css");
				response.writeHead(200, { "Content-Type": "text/css" }).end(css);
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
