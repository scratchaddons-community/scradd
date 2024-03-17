import { createReadStream, promises as fileSystem } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { client } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { cleanDatabaseListeners } from "../common/database.js";
import appealRequest from "../modules/forms/appeals/show-appeal.js";
import logError from "../modules/logging/errors.js";
import linkScratchRole from "../modules/roles/scratch.js";
import suggestionsPage from "../modules/suggestions/web.js";
import pkg from "../package.json" assert { type: "json" };
import { getRequestUrl } from "../util/text.js";

const CSS_FILE = (await fileSystem.readFile("./web/style.css", "utf8")).replaceAll(
	"#000",
	"#" + constants.themeColor.toString(16),
);
const CLIENT_JS_FILE = await fileSystem.readFile("./dist/web/client.js", "utf8");
const DISCORD_CSS_FILE = await fileSystem.readFile("./web/discord.css", "utf8");
const SORA_DIRECTORY = path.dirname(
	fileURLToPath(import.meta.resolve("@fontsource-variable/sora")),
);
const server = http.createServer(async (request, response) => {
	try {
		const requestUrl = getRequestUrl(request);
		const pathname = (
			requestUrl.pathname.endsWith("/") ? requestUrl.pathname : `${requestUrl.pathname}/`
		).toLowerCase();
		switch (pathname) {
			case "/clean-database-listeners/": {
				if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
					return response
						.writeHead(403, { "content-type": "text/plain" })
						.end("403 Forbidden");

				await cleanDatabaseListeners();
				process.emitWarning("cleanDatabaseListeners ran");
				response.writeHead(200, { "content-type": "text/plain" }).end("200 OK");

				return;
			}
			case "/ban-appeal/": {
				return await appealRequest(request, response);
			}
			case "/link-scratch/": {
				return await linkScratchRole(request, response);
			}
			case "/style.css/": {
				return response.writeHead(200, { "content-type": "text/css" }).end(CSS_FILE);
			}
			case "/client.js/": {
				return response
					.writeHead(200, { "content-type": "text/javascript" })
					.end(CLIENT_JS_FILE);
			}
			case "/discord.css/": {
				return response
					.writeHead(200, { "content-type": "text/css" })
					.end(DISCORD_CSS_FILE);
			}
			case "/icon.png/": {
				const options = { extension: "png", forceStatic: true, size: 128 } as const;
				return response
					.writeHead(301, {
						location:
							config.guild.iconURL(options) ?? client.user.displayAvatarURL(options),
					})
					.end();
			}
		}

		const segments = pathname.split("/");
		switch (segments[1]) {
			case "sora": {
				const filePath = path.join(SORA_DIRECTORY, segments.slice(2).join("/"));
				if (await fileSystem.access(filePath).catch(() => true)) break;
				return createReadStream(filePath).pipe(response);
			}
			case "suggestions": {
				return await suggestionsPage(request, response, segments[2]);
			}
			default: {
				break;
			}
		}

		response
			.writeHead(301, {
				location: config.guild.features.includes("DISCOVERABLE")
					? `https://discord.com/servers/${config.guild.id}`
					: pkg.homepage,
			})
			.end();
	} catch (error) {
		await logError(error, request.url ?? "").catch(console.error);
		response.writeHead(500, { "content-type": "text/plain" }).end("500 Internal Server Error");
	}
});

await new Promise<void>((resolve) => server.listen(process.env.PORT, resolve));
console.log("Server up!");
export default server;
