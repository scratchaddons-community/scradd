import { escapeMarkdown } from "discord.js";

import addons from "./addons.js";
import manifest from "./manifest.js";

/**
 * Trims the patch version off of a Semver.
 *
 * @param {string} full - The full version.
 *
 * @returns {string} - The patchless version.
 */
function trimPatchVersion(full) {
	return /^(?<main>\d+\.\d+)\.\d+/.exec(full)?.groups?.main || "";
}

const version = trimPatchVersion(manifest.version);

const QUESTIONS = {
	categories: {
		easterEgg: {
			question: "Is your addon an easter egg addon (shown after typing the Konami code)?",
			statement: "This addon is an easter egg addon!",
			userAsking: "Is this addon an easter egg addon?",
		},

		editor: {
			code: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Code Editor**?",

				statement:
					"You addon is listed under **Scratch Editor Features** -> **Code Editor**!",

				userAsking: "Is this addon listed under Scratch Editor Features -> Code Editor?",
			},

			costumes: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Costume Editor**?",

				statement:
					"This addon is listed under **Scratch Editor Features** -> **Costume Editor**!",

				userAsking: "Is this addon listed under Scratch Editor Features -> Costume Editor?",
			},

			other: {
				question: "Is your addon listed under **Scratch Editor Features** -> **Others**?",
				statement: "This addon is listed under **Scratch Editor Features** -> **Others**!",
				userAsking: "Is this addon listed under Scratch Editor Features -> Others?",
			},

			player: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Project Player**?",

				statement:
					"This addon is listed under **Scratch Editor Features** -> **Project Player**!",

				userAsking: "Is this addon listed under Scratch Editor Features -> Project Player?",
			},

			root: {
				question: "Is your addon listed under **Scratch Editor Features**?",
				statement: "This addon is listed under **Scratch Editor Features**!",
				userAsking: "Is this addon listed under Scratch Editor Features?",
			},
		},

		popup: {
			question: "Is your addon listed under **Extension Popup Features**?",
			statement: "This addon is listed under **Extension Popup Features**!",
			userAsking: "Is this addon listed under Extension Popup Features?",
		},

		themes: {
			question: "Is your addon listed under **Themes**?",
			statement: "This addon is listed under **Themes**!",
			userAsking: "Is this addon is listed under Themes?",
		},

		website: {
			forums: {
				question: "Is your addon listed under **Scratch Website Features** -> **Forums**?",
				statement: "This addon is listed under **Scratch Website Features** -> **Forums**!",
				userAsking: "Is this addon listed under Scratch Website Features -> Forums?",
			},

			other: {
				question: "Is your addon listed under **Scratch Website Features** -> **Others**?",
				statement: "This addon is listed under **Scratch Website Features** -> **Others**!",
				userAsking: "Is this addon listed under Scratch Website Features -> Others?",
			},

			profiles: {
				question:
					"Is your addon listed under **Scratch Website Features** -> **Profiles**?",

				statement:
					"This addon is listed under **Scratch Website Features** -> **Profiles**!",

				userAsking: "Is this addon listed under Scratch Website Features -> Profiles?",
			},

			projects: {
				question:
					"Is your addon listed under **Scratch Website Features** -> **Project Pages**?",

				statement:
					"This addon is listed under **Scratch Website Features** -> **Project Pages**!",

				userAsking: "Is this addon listed under Scratch Website Features -> Project Pages?",
			},

			root: {
				question: "Is your addon listed under **Scratch Website Features**?",
				statement: "This addon is listed under **Scratch Website Features**!",
				userAsking: "Is this addon listed under Scratch Website Features?",
			},
		},
	},

	groups: {
		beta: {
			question: "Is your addon found under **Beta** when disabled?",
			statement: "This addon is found under **Beta** when disabled!",
			userAsking: "Is this addon found under Beta when disabled?",
		},

		featured: {
			question: "Is your addon found under **Featured** when disabled?",
			statement: "This addon is found under **Featured** when disabled!",
			userAsking: "Is this addon found under Featured when disabled?",
		},

		forums: {
			question: "Is your addon found under **Forums** when disabled?",
			statement: "This addon is found under **Forums** when disabled",
			userAsking: "Is this addon found under Forums when disabled?",
		},

		others: {
			question: "Is your addon found under **Others** when disabled?",
			statement: "This addon is found under **Others** when disabled",
			userAsking: "Is this addon found under Others when disabled?",
		},
	},

	history: {
		new: {
			question: `Was your addon added in the latest version (**[${escapeMarkdown(
				version,
			)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
				version,
			)}.0)**)?`,

			statement: "This addon was added in the latest version!",
			userAsking: "Was this addon added in the latest version?",
		},

		updated: {
			question: `Was your addon updated (not including completely new addons) in the latest version (**[${escapeMarkdown(
				version,
			)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
				version,
			)}.0)**)?`,

			statement: "This addon was updated in the latest version!",
			userAsking: "Was this addon updated in the latest version?",
		},
	},

	settings: {
		credits: {
			question: "Does your addon have credits listed on the settings page?",
			statement: "This addon has credits listed on the settings page!",
			userAsking: "Does this addon have credits listed on the settings page?",
		},

		enabledDefault: {
			question: "Is your addon enabled by default?",
			statement: "This addon is enabled by default!",
			userAsking: "Is this addon enabled by default?",
		},

		info: {
			question: "Does your addon have any warnings and/or notices on the settings page?",
			statement: "This addon has warnings and/or notices on the settings page!",
			userAsking: "Does this addon have any warnings and/or notices on the settings page?",
		},

		presets: {
			question: "Does your addon have any presets for its settings?",
			statement: "This addon has presets for its settings!",
			userAsking: "Does this addon have any presets for its settings?",
		},

		preview: {
			question: "Does your addon have an interactive preview for its settings?",
			statement: "This addon has an interactive preview for its settings!",
			userAsking: "Does this addon have an interactive preview for its settings?",
		},

		settings: {
			question: "Does your addon have any settings?",
			statement: "This addon has settings!",
			userAsking: "Does this addon have any settings?",
		},
	},

	tags: {
		beta: {
			question: "Does your addon have the **Beta** tag?",
			statement: "This addon has the **Beta** tag!",
			userAsking: "Does this addon have the Beta tag?",
		},

		dangerous: {
			question: "Does your addon have the **Dangerous** tag?",
			statement: "This addon has the **Dangerous** tag!",
			userAsking: "Does this addon have the Dangerous tag?",
		},

		forums: {
			question: "Does your addon have the **Forums** tag?",
			statement: "This addon has the **Forums** tag!",
			userAsking: "Does this addon have the Forums tag?",
		},

		recommended: {
			question: "Does your addon have the **Recommended** tag?",
			statement: "This addon has the **Recommended** tag!",
			userAsking: "Does this addon have the Recommended tag?",
		},
	},
};

const forceEasterEggs = new Set(["cat-blocks"]);

/**
 * @type {{
 * 	[key: string]: {
 * 		dependencies?:
 * 			| {
 * 					[key: string]: boolean;
 * 			  }
 * 			| undefined;
 * 		group: string;
 * 		question: string;
 * 		statement: string;
 * 		userAsking: string;
 * 		order?: number | undefined;
 * 	}[];
 * }}
 */
const questionsByAddon = {};

for (const addon of addons) {
	const result = [];

	result.push(
		{
			dependencies: Object.fromEntries(
				addons
					.map(({ name }) => [
						`Does your addon’s name **start** with **${escapeMarkdown(
							name[0]?.toUpperCase() || "",
						)}**?`,
						false,
					])
					.filter(
						([question]) =>
							question !==
							`Does your addon’s name **start** with **${escapeMarkdown(
								addon.name[0]?.toUpperCase() || "",
							)}**?`,
					),
			),

			group: "Addon name",
			order: 1,

			question: `Does your addon’s name **start** with **${escapeMarkdown(
				addon.name[0]?.toUpperCase() || "",
			)}**?`,

			statement: `This addon’s name starts with **${escapeMarkdown(
				addon.name[0]?.toUpperCase() || "",
			)}**!`,

			userAsking: `Does this addon’s name start with ${addon.name[0]?.toUpperCase() || ""}?`,
		},
		{
			dependencies: Object.fromEntries(
				addons
					.map(({ name }) => [
						`Does your addon’s name **end** with **${escapeMarkdown(
							name.at(-1)?.toUpperCase() || "",
						)}**?`,
						false,
					])
					.filter(
						([question]) =>
							question !==
							`Does your addon’s name **end** with **${escapeMarkdown(
								addon.name.at(-1)?.toUpperCase() || "",
							)}**?`,
					),
			),

			group: "Addon name",
			order: 2,

			question: `Does your addon’s name **end** with **${escapeMarkdown(
				addon.name.at(-1)?.toUpperCase() || "",
			)}**?`,

			statement: `This addon’s name ends with **${escapeMarkdown(
				addon.name.at(-1)?.toUpperCase() || "",
			)}**!`,

			userAsking: `Does this addon’s name end with ${
				addon.name.at(-1)?.toUpperCase() || ""
			}?`,
		},
	);

	if (addon.enabledByDefault) {
		result.push({
			group: "Misc",
			order: 1,
			question: QUESTIONS.settings.enabledDefault.question,
			statement: QUESTIONS.settings.enabledDefault.statement,
			userAsking: QUESTIONS.settings.enabledDefault.userAsking,
		});
	}

	const category = addon.tags.includes("popup")
		? "popup"
		: addon.tags.includes("easterEgg")
		? "easterEgg"
		: addon.tags.includes("theme")
		? "theme"
		: addon.tags.includes("community")
		? "community"
		: "editor";

	switch (category) {
		case "theme": {
			result.push(
				{
					dependencies: {
						[QUESTIONS.categories.editor.root.question]: false,
						[QUESTIONS.categories.website.root.question]: false,
						[QUESTIONS.categories.popup.question]: false,

						[QUESTIONS.categories.easterEgg.question]: forceEasterEggs.has(addon.id)
							? undefined
							: false,
					},

					group: "Categorization",
					order: 20,
					question: QUESTIONS.categories.themes.question,
					statement: QUESTIONS.categories.themes.statement,
					userAsking: QUESTIONS.categories.themes.userAsking,
				},
				{
					dependencies: {
						[QUESTIONS.categories.themes.question]: true,

						[`Is your addon listed under **Themes** -> **${
							addon.tags.includes("editor") ? "Website" : "Editor"
						} Themes**?`]: false,
					},

					group: "Categorization",
					order: 21,

					question: `Is your addon listed under **Themes** -> **${
						addon.tags.includes("editor") ? "Editor" : "Website"
					} Themes**?`,

					statement: `This addon is listed under **Themes** -> **${
						addon.tags.includes("editor") ? "Editor" : "Website"
					} Themes**!`,

					userAsking: `Is this addon listed under Themes -> ${
						addon.tags.includes("editor") ? "Editor" : "Website"
					} Themes?`,
				},
			);

			break;
		}
		case "editor": {
			result.push({
				dependencies: {
					[QUESTIONS.categories.themes.question]: false,
					[QUESTIONS.categories.website.root.question]: false,
					[QUESTIONS.categories.popup.question]: false,

					[QUESTIONS.categories.easterEgg.question]: forceEasterEggs.has(addon.id)
						? undefined
						: false,
				},

				group: "Categorization",
				order: 10,
				question: QUESTIONS.categories.editor.root.question,
				statement: QUESTIONS.categories.editor.root.statement,
				userAsking: QUESTIONS.categories.editor.root.userAsking,
			});

			if (addon.tags.includes("codeEditor")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.editor.root.question]: true,
						[QUESTIONS.categories.editor.other.question]: false,
						[QUESTIONS.categories.editor.costumes.question]: false,
						[QUESTIONS.categories.editor.player.question]: false,
					},

					group: "Categorization",
					order: 11,
					question: QUESTIONS.categories.editor.code.question,
					statement: QUESTIONS.categories.editor.code.statement,
					userAsking: QUESTIONS.categories.editor.code.userAsking,
				});
			} else if (addon.tags.includes("costumeEditor")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.editor.root.question]: true,
						[QUESTIONS.categories.editor.code.question]: false,
						[QUESTIONS.categories.editor.other.question]: false,
						[QUESTIONS.categories.editor.player.question]: false,
					},

					group: "Categorization",
					order: 12,
					question: QUESTIONS.categories.editor.costumes.question,
					statement: QUESTIONS.categories.editor.costumes.statement,
					userAsking: QUESTIONS.categories.editor.costumes.userAsking,
				});
			} else if (addon.tags.includes("projectPlayer")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.editor.root.question]: true,
						[QUESTIONS.categories.editor.code.question]: false,
						[QUESTIONS.categories.editor.costumes.question]: false,
						[QUESTIONS.categories.editor.other.question]: false,
					},

					group: "Categorization",
					order: 13,
					question: QUESTIONS.categories.editor.player.question,
					statement: QUESTIONS.categories.editor.player.statement,
					userAsking: QUESTIONS.categories.editor.player.userAsking,
				});
			} else {
				result.push({
					dependencies: {
						[QUESTIONS.categories.editor.root.question]: true,
						[QUESTIONS.categories.editor.code.question]: false,
						[QUESTIONS.categories.editor.costumes.question]: false,
						[QUESTIONS.categories.editor.player.question]: false,
					},

					group: "Categorization",
					order: 14,
					question: QUESTIONS.categories.editor.other.question,
					statement: QUESTIONS.categories.editor.other.statement,
					userAsking: QUESTIONS.categories.editor.other.userAsking,
				});
			}

			break;
		}
		case "community": {
			if (addon.tags.includes("profiles")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.website.root.question]: true,
						[QUESTIONS.categories.website.other.question]: false,
						[QUESTIONS.categories.website.projects.question]: false,
						[QUESTIONS.categories.website.forums.question]: false,
					},

					group: "Categorization",
					order: 17,
					question: QUESTIONS.categories.website.profiles.question,
					statement: QUESTIONS.categories.website.profiles.statement,
					userAsking: QUESTIONS.categories.website.profiles.userAsking,
				});
			} else if (addon.tags.includes("projectPage")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.website.root.question]: true,
						[QUESTIONS.categories.website.profiles.question]: false,
						[QUESTIONS.categories.website.other.question]: false,
						[QUESTIONS.categories.website.forums.question]: false,
					},

					group: "Categorization",
					order: 16,
					question: QUESTIONS.categories.website.projects.question,
					statement: QUESTIONS.categories.website.projects.statement,
					userAsking: QUESTIONS.categories.website.projects.userAsking,
				});
			} else if (addon.tags.includes("forums")) {
				result.push({
					dependencies: {
						[QUESTIONS.categories.website.root.question]: true,
						[QUESTIONS.categories.website.profiles.question]: false,
						[QUESTIONS.categories.website.projects.question]: false,
						[QUESTIONS.categories.website.other.question]: false,
					},

					group: "Categorization",
					order: 18,
					question: QUESTIONS.categories.website.forums.question,
					statement: QUESTIONS.categories.website.forums.statement,
					userAsking: QUESTIONS.categories.website.forums.userAsking,
				});
			} else {
				result.push({
					dependencies: {
						[QUESTIONS.categories.website.root.question]: true,
						[QUESTIONS.categories.website.profiles.question]: false,
						[QUESTIONS.categories.website.projects.question]: false,
						[QUESTIONS.categories.website.forums.question]: false,
					},

					group: "Categorization",
					order: 19,
					question: QUESTIONS.categories.website.other.question,
					statement: QUESTIONS.categories.website.other.statement,
					userAsking: QUESTIONS.categories.website.other.userAsking,
				});
			}

			result.push({
				dependencies: {
					[QUESTIONS.categories.themes.question]: false,
					[QUESTIONS.categories.editor.root.question]: false,
					[QUESTIONS.categories.popup.question]: false,
				},

				group: "Categorization",
				order: 15,
				question: QUESTIONS.categories.website.root.question,
				statement: QUESTIONS.categories.website.root.statement,
				userAsking: QUESTIONS.categories.website.root.userAsking,
			});

			break;
		}
		case "popup": {
			result.push({
				dependencies: {
					[QUESTIONS.categories.themes.question]: false,
					[QUESTIONS.categories.editor.root.question]: false,
					[QUESTIONS.categories.website.root.question]: false,
				},

				group: "Categorization",
				order: 22,
				question: QUESTIONS.categories.popup.question,
				statement: QUESTIONS.categories.popup.statement,
				userAsking: QUESTIONS.categories.popup.userAsking,
			});

			break;
		}
		case "easterEgg": {
			result.push({
				dependencies: {
					[QUESTIONS.categories.themes.question]: false,
					[QUESTIONS.categories.popup.question]: false,
					[QUESTIONS.categories.editor.root.question]: false,
					[QUESTIONS.categories.website.root.question]: false,
				},

				group: "Categorization",
				order: 23,
				question: QUESTIONS.categories.easterEgg.question,
				statement: QUESTIONS.categories.easterEgg.statement,
				userAsking: QUESTIONS.categories.easterEgg.userAsking,
			});

			break;
		}
	}

	if (forceEasterEggs.has(addon.id)) {
		result.push({
			group: "Categorization",
			question: QUESTIONS.categories.easterEgg.question,
			statement: QUESTIONS.categories.easterEgg.statement,
			userAsking: QUESTIONS.categories.easterEgg.userAsking,
		});
	}

	if (addon.tags.includes("recommended")) {
		result.push({
			dependencies: {
				[QUESTIONS.groups.featured.question]: false,
				[QUESTIONS.groups.beta.question]: false,
				[QUESTIONS.groups.others.question]: false,
			},

			group: "Categorization",
			question: QUESTIONS.tags.recommended.question,
			statement: QUESTIONS.tags.recommended.statement,
			order: 1,
			userAsking: QUESTIONS.tags.recommended.userAsking,
		});
	} else if (addon.tags.includes("featured")) {
		result.push({
			dependencies: {
				[QUESTIONS.groups.beta.question]: false,
				[QUESTIONS.groups.forums.question]: false,
				[QUESTIONS.groups.others.question]: false,
				[QUESTIONS.tags.recommended.question]: false,
			},

			group: "Categorization",
			order: 5,
			question: QUESTIONS.groups.featured.question,
			statement: QUESTIONS.groups.featured.statement,
			userAsking: QUESTIONS.groups.featured.userAsking,
		});
	} else if (addon.tags.includes("beta") || addon.tags.includes("danger")) {
		result.push({
			dependencies: {
				[QUESTIONS.groups.featured.question]: false,
				[QUESTIONS.groups.forums.question]: false,
				[QUESTIONS.groups.others.question]: false,
			},

			group: "Categorization",
			order: 7,
			question: QUESTIONS.groups.beta.question,
			statement: QUESTIONS.groups.beta.statement,
			userAsking: QUESTIONS.groups.beta.userAsking,
		});
	} else if (addon.tags.includes("forums")) {
		result.push({
			dependencies: {
				[QUESTIONS.groups.featured.question]: false,
				[QUESTIONS.groups.beta.question]: false,
				[QUESTIONS.tags.forums.question]: true,
				[QUESTIONS.groups.others.question]: false,
			},

			group: "Categorization",
			order: 6,
			question: QUESTIONS.groups.forums.question,
			statement: QUESTIONS.groups.forums.statement,
			userAsking: QUESTIONS.groups.forums.userAsking,
		});
	} else {
		result.push({
			dependencies: {
				[QUESTIONS.groups.featured.question]: false,
				[QUESTIONS.groups.beta.question]: false,
				[QUESTIONS.groups.forums.question]: false,
				[QUESTIONS.tags.forums.question]: false,
			},

			group: "Categorization",
			order: 8,
			question: QUESTIONS.groups.others.question,
			statement: QUESTIONS.groups.others.statement,
			userAsking: QUESTIONS.groups.others.userAsking,
		});
	}

	if (addon.tags.includes("danger")) {
		result.push({
			dependencies: { [QUESTIONS.groups.beta.question]: true },
			group: "Categorization",
			order: 4,
			question: QUESTIONS.tags.dangerous.question,
			statement: QUESTIONS.tags.dangerous.statement,
			userAsking: QUESTIONS.tags.dangerous.userAsking,
		});
	}

	if (addon.tags.includes("forums")) {
		result.push({
			dependencies: { [QUESTIONS.groups.others.question]: false },
			group: "Categorization",
			order: 2,
			question: QUESTIONS.tags.forums.question,
			statement: QUESTIONS.tags.forums.statement,
			userAsking: QUESTIONS.tags.forums.userAsking,
		});
	}

	if (addon.tags.includes("beta")) {
		result.push({
			dependencies: { [QUESTIONS.groups.beta.question]: true },
			group: "Categorization",
			order: 3,
			question: QUESTIONS.tags.beta.question,
			statement: QUESTIONS.tags.beta.statement,
			userAsking: QUESTIONS.tags.beta.userAsking,
		});
	}

	if (addon.credits) {
		result.push(
			{
				group: "Credits",
				order: 1,
				question: QUESTIONS.settings.credits.question,
				statement: QUESTIONS.settings.credits.statement,
				userAsking: QUESTIONS.settings.credits.userAsking,
			},
			...addon.credits.map(({ name }) => ({
				dependencies: { [QUESTIONS.settings.credits.question]: true },
				group: "Credits",
				order: 2,
				question: `Did **${escapeMarkdown(name)}** contribute to your addon?`,
				statement: `**${escapeMarkdown(name)}** contributed to this addon!`,
				userAsking: `Did ${name} contribute to this addon?`,
			})),
		);
	}

	if (addon.settings) {
		result.push({
			group: "Misc",
			order: 2,
			question: QUESTIONS.settings.settings.question,
			statement: QUESTIONS.settings.settings.statement,
			userAsking: QUESTIONS.settings.settings.userAsking,
		});
	}

	if (addon.presets) {
		result.push({
			dependencies: { [QUESTIONS.settings.settings.question]: true },
			group: "Misc",
			order: 3,
			question: QUESTIONS.settings.presets.question,
			statement: QUESTIONS.settings.presets.statement,
			userAsking: QUESTIONS.settings.presets.userAsking,
		});
	}

	if (addon.addonPreview) {
		result.push({
			dependencies: { [QUESTIONS.settings.settings.question]: true },
			group: "Misc",
			order: 4,
			question: QUESTIONS.settings.preview.question,
			statement: QUESTIONS.settings.preview.statement,
			userAsking: QUESTIONS.settings.preview.userAsking,
		});
	}

	if (addon.info) {
		result.push({
			group: "Misc",
			order: 5,
			question: QUESTIONS.settings.info.question,
			statement: QUESTIONS.settings.info.statement,
			userAsking: QUESTIONS.settings.info.userAsking,
		});
	}

	if (addon.versionAdded && version === trimPatchVersion(addon.versionAdded)) {
		result.push(
			{
				group: "Misc",
				order: 6,
				question: QUESTIONS.history.new.question,
				statement: QUESTIONS.history.new.statement,
				userAsking: QUESTIONS.history.new.userAsking,
			},
			{
				dependencies: {
					[QUESTIONS.history.new.question]: true,

					[`Is your addon found under **${
						addon.tags.includes("recommended") || addon.tags.includes("featured")
							? "Other"
							: "Featured"
					} new addons and updates** as of version **[${escapeMarkdown(
						version,
					)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
						version,
					)}.0)**?`]: false,
				},

				group: "Categorization",
				order: 9,

				question: `Is your addon found under **${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates** as of version **[${escapeMarkdown(
					version,
				)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
					version,
				)}.0)**?`,

				userAsking: `Is this addon currently found under ${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates?`,

				statement: `This addon is currently found under **${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates**!`,
			},
		);
	}

	if (addon.latestUpdate && version === trimPatchVersion(addon.latestUpdate.version)) {
		result.push(
			{
				group: "Misc",
				question: QUESTIONS.history.updated.question,
				statement: QUESTIONS.history.updated.statement,
				userAsking: QUESTIONS.history.updated.userAsking,
			},

			{
				dependencies: {
					[QUESTIONS.history.updated.question]: true,

					[`Does your addon have the **${
						addon.latestUpdate.newSettings?.length ? "New features" : "New settings"
					}** tag?`]: false,
				},

				group: "Misc",

				question: `Does your addon have the **${
					addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
				}** tag?`,

				statement: `This addon has the **${
					addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
				}** tag!`,

				userAsking: `Does this addon have the ${
					addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
				} tag?`,
			},
			{
				dependencies: {
					[QUESTIONS.history.updated.question]: true,

					[`Is your addon found under **${
						addon.latestUpdate.isMajor ? "Other" : "Featured"
					} new addons and updates** as of **[${escapeMarkdown(
						version,
					)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
						version,
					)}.0)**?`]: false,
				},

				group: "Categorization",
				order: 9,

				question: `Is your addon found under **${
					addon.latestUpdate.isMajor ? "Featured" : "Other"
				} new addons and updates** as of **[${escapeMarkdown(
					version,
				)}](https://github.com/ScratchAddons/ScratchAddons/releases/tag/v${encodeURI(
					version,
				)}.0)**?`,

				userAsking: `Is this addon currently found under ${
					addon.latestUpdate.isMajor ? "Featured" : "Other"
				} new addons and updates?`,

				statement: `This addon is currently found under **${
					addon.latestUpdate.isMajor ? "Featured" : "Other"
				} new addons and updates**!`,
			},
		);
	}

	questionsByAddon[addon.id] = result;
}

export default questionsByAddon;
