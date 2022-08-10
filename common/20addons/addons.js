import fetch from "node-fetch";

import CONSTANTS from "../CONSTANTS.js";

const addonIds = await fetch(`${CONSTANTS.repos.sa}/addons/addons.json`).then(
	async (response) => await /** @type {Promise<string[]>} */ (response.json()),
);
const addonPromises = [];

for (const addonId of addonIds.filter((item) => !item.startsWith("//"))) {
	addonPromises.push(
		fetch(`${CONSTANTS.repos.sa}/addons/${encodeURI(addonId)}/addon.json`).then(
			async (response) => ({
				...(await /** @type {Promise<import("../../types/addonManifest").default>} */ (
					response.json()
				)),

				id: addonId,
			}),
		),
	);
}

export default await Promise.all(addonPromises);
