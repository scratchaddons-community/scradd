import fetch from "node-fetch";

import CONSTANTS from "./CONSTANTS.js";

export const manifest = await fetch(`${CONSTANTS.urls.saSource}/manifest.json`).then(
	async (response) => await /** @type {Promise<chrome.runtime.Manifest>} */ (response.json()),
);

const addonIds = await fetch(`${CONSTANTS.urls.saSource}/addons/addons.json`).then(
	async (response) => await /** @type {Promise<string[]>} */ (response.json()),
);

export const addons = await Promise.all(
	addonIds
		.filter((item) => !item.startsWith("//"))
		.map((addonId) =>
			fetch(`${CONSTANTS.urls.saSource}/addons/${encodeURI(addonId)}/addon.json`).then(
				async (response) => ({
					...(await /** @type {Promise<import("./types/addonManifest").default>} */ (
						response.json()
					)),

					id: addonId,
				}),
			),
		),
);
