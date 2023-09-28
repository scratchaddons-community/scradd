import type AddonManifest from "./types/addonManifest.js";
import addonIds from "../extension/addons/addons.json" assert { type: "json" };

const promises = addonIds
	.filter((item) => !item.startsWith("//"))
	.map(async (addonId) => {
		const manifest = (await import(`../extension/addons/${addonId}/addon.json`, {
			assert: { type: "json" },
		})) as { default: AddonManifest };
		return { id: addonId, ...manifest.default };
	});
const addons = await Promise.all(promises);
export default addons.toSorted((one, two) => one.name.localeCompare(two.name));

export const addonSearchOptions = {
	keys: [
		(item: typeof addons[number]) => item.id.replaceAll("-", " "),
		"id",
		"name",
		"description",
		"settings.*.name",
		"credits.*.name",
	],
};
