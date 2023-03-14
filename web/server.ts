import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import path from "node:path";
import fileSystem from "node:fs/promises";
import mime from "mime-types";
import { createRequire } from "node:module";
// import CONSTANTS from "../common/CONSTANTS.js";
// import client from "../client.js";
// import { REST, RESTGetAPIUserResult, RESTPostOAuth2AccessTokenResult, Routes } from "discord.js";

const require = createRequire(import.meta.url);

mime.types.ts = "text/plain";
const PACKAGE_RESOLVES: Record<string, string> = {};
// const rest = new REST({ authPrefix: "Bearer" });
http.createServer((request, response) => {
	try {
		const requestUrl = new URL(request.url ?? "", `https://${request.headers.host}`);

		const packageName = PACKAGE_RESOLVES[requestUrl.pathname];
		if (packageName) {
			const resolved = require.resolve(packageName);

			return fileSystem.readFile(resolved, "utf8").then((file) => {
				if (path.extname(resolved) === ".js") {
					file = file.replaceAll(
						/import\s+(?<importedNames>.+?)\s+from\s+['"`](?<moduleName>[^.].*?)['"`]/gms,
						'import $<importedNames> from "./$<moduleName>.js"',
					);
				}

				response
					.writeHead(200, { "Content-Type": mime.lookup(resolved) || "text/plain" })
					.end(file);
			});
		}

		switch (requestUrl.pathname) {
			case "/clean-database-listeners": {
				if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
					response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
				else {
					process.emitWarning("cleanDatabaseListeners called");
					cleanDatabaseListeners().then(() => {
						process.emitWarning("cleanDatabaseListeners ran");
						response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
					});
				}
				break;
			}
			// case "ban-appeal": {
			// 	const code = requestUrl.searchParams.get("code");
			// 	if (!code) {
			// 		response.writeHead(302, {
			// 			Location: `https://discord.com/api/oauth2/authorize?client_id=${
			// 				client.user.id
			// 			}&redirect_uri=${encodeURIComponent(
			// 				`${requestUrl.origin}/${requestUrl.pathname}`,
			// 			)}&response_type=code&scope=identify&prompt=none`,
			// 		});
			// 		break;
			// 	}
			// 	const data = (await rest.post(Routes.oauth2TokenExchange(), {
			// 		auth: false,
			// 		body: new URLSearchParams({
			// 			client_id: client.user.id,
			// 			client_secret: process.env.BOT_SECRET,
			// 			grant_type: "authorization_code",
			// 			code: code,
			// 			redirect_uri: `${requestUrl.origin}/${requestUrl.pathname}`,
			// 		}),
			// 	})) as RESTPostOAuth2AccessTokenResult;

			// 	rest.setToken(data.access_token);

			// 	const user = (await rest.get(Routes.user())) as RESTGetAPIUserResult;

			// 	const ban = await CONSTANTS.guild.bans.fetch(user.id).catch(() => {});
			// 	if (!ban) {
			// 		return; // TODO: user is not banned
			// 	}

			// 	const userPublic = {
			// 		id: user.id,
			// 		avatar: user.avatar,
			// 		username: user.username,
			// 		discriminator: user.discriminator,
			// 		ban: ban.reason,
			// 	};

			// 	return {
			// 		statusCode: 303,
			// 		headers: {
			// 			Location: `/form?token=${encodeURIComponent(
			// 				createJwt(userPublic, data.expires_in),
			// 			)}`,
			// 		},
			// 	};
			// }
		}
	} catch (error) {
		response.writeHead(500).end(error.name + ": " + error.message);
	}
}).listen(process.env.PORT, () => {
	console.log("Server up!");
});
