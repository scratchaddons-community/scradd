import fetch from "node-fetch";
import CONSTANTS from "./CONSTANTS.js";
import type AddonManifest from "./types/addonManifest.js";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

export const manifest = await fetch(`${CONSTANTS.urls.saSource}/manifest.json`).then(
	async (response) => await (response.json() as Promise<chrome.runtime.Manifest>),
);

const addonIds = await fetch(`${CONSTANTS.urls.saSource}/addons/addons.json`).then(
	async (response) => await (response.json() as Promise<string[]>),
);

export const addons = await Promise.all(
	addonIds
		.filter((item) => !item.startsWith("//"))
		.map((addonId) =>
			fetch(`${CONSTANTS.urls.saSource}/addons/${encodeURI(addonId)}/addon.json`).then(
				async (response) => ({
					...(await (response.json() as Promise<AddonManifest>)),

					id: addonId,
				}),
			),
		),
);
