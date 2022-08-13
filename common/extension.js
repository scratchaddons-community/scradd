import fetch from "node-fetch";

import CONSTANTS from "./CONSTANTS.js";

export const manifest = await fetch(`${CONSTANTS.urls.saSource}/manifest.json`).then(
	async (response) => await /** @type {Promise<chrome.runtime.ManifestV2>} */ (response.json()),
);

const addonIds = await fetch(`${CONSTANTS.urls.saSource}/addons/addons.json`).then(
	async (response) => await /** @type {Promise<string[]>} */ (response.json()),
);
const addonPromises = [];

for (const addonId of addonIds.filter((item) => !item.startsWith("//"))) {
	addonPromises.push(
		fetch(`${CONSTANTS.urls.saSource}/addons/${encodeURI(addonId)}/addon.json`).then(
			async (response) => ({
				...(await /** @type {Promise<import("../types/addonManifest").default>} */ (
					response.json()
				)),

				id: addonId,
			}),
		),
	);
}

export const addons = await Promise.all(addonPromises);
