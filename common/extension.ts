import config from "./config.js";
import type AddonManifest from "./types/addonManifest.js";

export const manifest = await fetch(`${config.urls.saSource}/manifest.json`).then(
	async (response) => await response.json<chrome.runtime.Manifest>(),
);

const addonIds = await fetch(`${config.urls.saSource}/addons/addons.json`).then(
	async (response) => await response.json<string[]>(),
);

export const addons = (
	await Promise.all(
		addonIds
			.filter((item) => !item.startsWith("//"))
			.map(
				async (addonId) =>
					await fetch(
						`${config.urls.saSource}/addons/${encodeURI(addonId)}/addon.json`,
					).then(async (response) => ({
						...(await response.json<AddonManifest>()),

						id: addonId,
					})),
			),
	)
).sort((one, two) => one.name.localeCompare(two.name));

export const addonSearchOptions = {
	keys: [
		(item: typeof addons[number]) => item.id.replace(/-/g, " "),
		"id",
		"name",
		"description",
		"settings.*.name",
		"credits.*.name",
	],
};
