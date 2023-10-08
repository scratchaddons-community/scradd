import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import logError from "../modules/logging/errors.js";
import fs from "fs";
import { client } from "strife.js";

http.createServer(async (request, response) => {
	try {
		const requestUrl = new URL(request.url ?? "", `https://${request.headers.host}`);
		const params = new URLSearchParams(new URL(request.url ?? "").search);

		if (requestUrl.pathname === "/clean-database-listeners") {
			if (requestUrl.searchParams.get("auth") === process.env.CDBL_AUTH) {
				process.emitWarning("cleanDatabaseListeners called");
				cleanDatabaseListeners().then(
					() => {
						process.emitWarning("cleanDatabaseListeners ran");
						response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
					},
					(error) => logError(error, request.url ?? ""),
				);
			} else {
				response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
			}
		} else if (requestUrl.pathname === "/appeal") {
			if (!params?.get("code")) return;
			let codeParam: string = params.get("code") || "";
			let tokenResponseData = await (
				await fetch("https://discord.com/api/oauth2/token", {
					method: "POST",
					body: new URLSearchParams({
						client_id: "929928324959055932",
						client_secret: "",
						code: codeParam,
						grant_type: "authorization_code",
						redirect_uri: "https://sa-discord.up.railway.app/appeal",
						scope: "identify",
					}).toString(),
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				})
			).json();
			let token_type: string = (tokenResponseData as any)?.token_type;
			let access_token: string = (tokenResponseData as any)?.access_token;
			if (access_token) {
				let user = await (
					await fetch("https://discord.com/api/users/@me", {
						headers: {
							authorization: `${token_type} ${access_token}`,
						},
					})
				).json();
				let userId: string = (user as any)?.id;
				if (userId) {
					let bannedUser: object = (await client.users.fetch(userId).catch()) || {
						username: "",
					};
					fs.readFile("./appeal/appeal.html", function (err, html) {
						if (err) {
							throw err;
						}
						response
							.writeHead(200, { "Content-Type": "text/html" })
							.end(
								html
									.toString()
									.replaceAll("{username}", (bannedUser as any)?.username || ""),
							);
					});
				} else {
					response
						.writeHead(503, { "Content-Type": "text/plain" })
						.end("Verification Failed");
				}
			} else {
				response
					.writeHead(503, { "Content-Type": "text/plain" })
					.end("Verification Failed");
			}
		} else if ((requestUrl.pathname = "/appeal.css")) {
			fs.readFile("./appeal/appeal.css", function (err, css) {
				if (err) {
					throw err;
				}
				response.writeHead(200, { "Content-Type": "text/css" }).end(css);
			});
		} else if ((requestUrl.pathname = "/scradd.svg")) {
			fs.readFile("./appeal/scradd.svg", function (err, css) {
				if (err) {
					throw err;
				}
				response.writeHead(200, { "Content-Type": "text/css" }).end(css);
			});
		} else {
			response.writeHead(404, { "Content-Type": "text/plain" }).end("Not Found");
		}
	} catch (error) {
		response.writeHead(500).end("Internal Server Error");
		logError(error, request.url ?? "").catch((error) => {
			throw error;
		});
	}
}).listen(process.env.PORT, () => {
	console.log("Server up!");
});
