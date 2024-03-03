import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import logError from "../modules/logging/errors.js";
import { createReadStream, promises as fileSystem } from "node:fs";
import { client } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import appealRequest from "../modules/forms/appeals/showAppeal.js";
import pkg from "../package.json" assert { type: "json" };
import { fileURLToPath } from "node:url";
import path from "node:path";
import linkScratchRole from "../modules/roles/scratch.js";
import { getRequestUrl } from "../util/text.js";

const CSS_FILE = (await fileSystem.readFile("./web/style.css", "utf8")).replaceAll(
	"#000",
	"#" + constants.themeColor.toString(16),
);
const NOT_FOUND_PAGE = await fileSystem.readFile("./web/404.html", "utf8");
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
						.end("Forbidden");

				await cleanDatabaseListeners();
				process.emitWarning("cleanDatabaseListeners ran");
				response.writeHead(200, { "content-type": "text/plain" }).end("Success");

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
			case "/icon.png/": {
				const options = { extension: "png", forceStatic: true, size: 128 } as const;
				return response
					.writeHead(301, {
						location:
							config.guild.iconURL(options) ?? client.user.displayAvatarURL(options),
					})
					.end();
			}
			case "/": {
				return response
					.writeHead(301, {
						location: config.guild.features.includes("DISCOVERABLE")
							? `https://discord.com/servers/${config.guild.id}`
							: pkg.homepage,
					})
					.end();
			}
		}

		const segments = pathname.split("/");
		if (segments[1] === "sora") {
			const filePath = path.join(SORA_DIRECTORY, segments.slice(2).join("/"));
			if (!(await fileSystem.access(filePath).catch(() => true)))
				return createReadStream(filePath).pipe(response);
		}
		response.writeHead(404, { "content-type": "text/html" }).end(NOT_FOUND_PAGE);
	} catch (error) {
		await logError(error, request.url ?? "").catch(console.error);
		response.writeHead(500).end("Internal Server Error");
	}
});

await new Promise<void>((resolve) => server.listen(process.env.PORT, resolve));
console.log("Server up!");
export default server;
