import { escapeMarkdown } from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import { manifest, addons } from "../../common/extension.js";
import { trimPatchVersion } from "../../util/text.js";

export const GROUP_NAMES = ["Addon name", "Categorization", "Credits", "Misc"] as const;
export type GroupName = typeof GROUP_NAMES[number];

export type Dependencies = { [key: string]: boolean | undefined };
export type AddonQuestion = {
	/** Questions that, if this question is `true`, must have this answer. */
	dependencies?: Dependencies;
	/** The group to put this question in for `/guess-addon player`. */
	group: GroupName;
	/** The question to ask. Supports Markdown formatting. */
	question: string;
	/** A statement that says this question is `true`. Supports Markdown formatting. */
	statement: string;
	/** The question to ask, but without any Markdown formatting (and may also be a bit shorter) */
	markdownless: string;
	/** The order to put this question in `/guess-addon player`. */
	order?: number;
};

const addonStartings = Object.fromEntries(
	addons.map(({ name }) => [
		`Does your addon’s name **start** with **${escapeMarkdown(
			name[0]?.toUpperCase() ?? "",
		)}**?`,
		false,
	]),
);
const addonEndings = Object.fromEntries(
	addons.map(({ name }) => [
		`Does your addon’s name **end** with **${escapeMarkdown(
			name.at(-1)?.toUpperCase() ?? "",
		)}**?`,
		false,
	]),
);
const versionMarkdown = `**[${escapeMarkdown(
	manifest.version_name ?? manifest.version,
)}](https://github.com/${CONSTANTS.urls.saRepo}${
	manifest.version_name?.endsWith("-prerelease")
		? ""
		: `/releases/tag/v${encodeURI(manifest.version)}`
})**`;
const questionStrings = {
	categories: {
		easterEgg: {
			question: "Is your addon an easter egg addon (shown after typing the Konami code)?",
			statement: "This addon is an easter egg addon!",
			markdownless: "Is this addon an easter egg addon?",
		},

		editor: {
			code: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Code Editor**?",

				statement:
					"This addon is listed under **Scratch Editor Features** -> **Code Editor**!",

				markdownless: "Is this addon listed under Scratch Editor Features -> Code Editor?",
			},

			costumes: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Costume Editor**?",

				statement:
					"This addon is listed under **Scratch Editor Features** -> **Costume Editor**!",

				markdownless:
					"Is this addon listed under Scratch Editor Features -> Costume Editor?",
			},

			other: {
				question: "Is your addon listed under **Scratch Editor Features** -> **Others**?",
				statement: "This addon is listed under **Scratch Editor Features** -> **Others**!",
				markdownless: "Is this addon listed under Scratch Editor Features -> Others?",
			},

			player: {
				question:
					"Is your addon listed under **Scratch Editor Features** -> **Project Player**?",

				statement:
					"This addon is listed under **Scratch Editor Features** -> **Project Player**!",

				markdownless:
					"Is this addon listed under Scratch Editor Features -> Project Player?",
			},

			root: {
				question: "Is your addon listed under **Scratch Editor Features**?",
				statement: "This addon is listed under **Scratch Editor Features**!",
				markdownless: "Is this addon listed under Scratch Editor Features?",
			},
		},

		popup: {
			question: "Is your addon listed under **Extension Popup Features**?",
			statement: "This addon is listed under **Extension Popup Features**!",
			markdownless: "Is this addon listed under Extension Popup Features?",
		},

		themes: {
			question: "Is your addon listed under **Themes**?",
			statement: "This addon is listed under **Themes**!",
			markdownless: "Is this addon is listed under Themes?",
		},

		website: {
			forums: {
				question: "Is your addon listed under **Scratch Website Features** -> **Forums**?",
				statement: "This addon is listed under **Scratch Website Features** -> **Forums**!",
				markdownless: "Is this addon listed under Scratch Website Features -> Forums?",
			},

			other: {
				question: "Is your addon listed under **Scratch Website Features** -> **Others**?",
				statement: "This addon is listed under **Scratch Website Features** -> **Others**!",
				markdownless: "Is this addon listed under Scratch Website Features -> Others?",
			},

			profiles: {
				question:
					"Is your addon listed under **Scratch Website Features** -> **Profiles**?",

				statement:
					"This addon is listed under **Scratch Website Features** -> **Profiles**!",

				markdownless: "Is this addon listed under Scratch Website Features -> Profiles?",
			},

			projects: {
				question:
					"Is your addon listed under **Scratch Website Features** -> **Project Pages**?",

				statement:
					"This addon is listed under **Scratch Website Features** -> **Project Pages**!",

				markdownless:
					"Is this addon listed under Scratch Website Features -> Project Pages?",
			},

			root: {
				question: "Is your addon listed under **Scratch Website Features**?",
				statement: "This addon is listed under **Scratch Website Features**!",
				markdownless: "Is this addon listed under Scratch Website Features?",
			},
		},
	},

	groups: {
		beta: {
			question: "Is your addon found under **Beta** when disabled?",
			statement: "This addon is found under **Beta** when disabled!",
			markdownless: "Is this addon found under Beta when disabled?",
		},

		featured: {
			question: "Is your addon found under **Featured** when disabled?",
			statement: "This addon is found under **Featured** when disabled!",
			markdownless: "Is this addon found under Featured when disabled?",
		},

		forums: {
			question: "Is your addon found under **Forums** when disabled?",
			statement: "This addon is found under **Forums** when disabled",
			markdownless: "Is this addon found under Forums when disabled?",
		},

		others: {
			question: "Is your addon found under **Others** when disabled?",
			statement: "This addon is found under **Others** when disabled",
			markdownless: "Is this addon found under Others when disabled?",
		},
	},

	history: {
		new: {
			question: `Was your addon added in the latest version (${versionMarkdown})?`,
			statement: "This addon was added in the latest version!",
			markdownless: "Was this addon added in the latest version?",
		},

		updated: {
			question: `Was your addon updated (not including completely new addons) in the latest version (${versionMarkdown})?`,
			statement: "This addon was updated in the latest version!",
			markdownless: "Was this addon updated in the latest version?",
		},
	},

	settings: {
		credits: {
			question: "Does your addon have credits listed on the settings page?",
			statement: "This addon has credits listed on the settings page!",
			markdownless: "Does this addon have credits listed on the settings page?",
		},

		enabledDefault: {
			question: "Is your addon enabled by default?",
			statement: "This addon is enabled by default!",
			markdownless: "Is this addon enabled by default?",
		},

		info: {
			question: "Does your addon have any notices on the settings page?",
			statement: "This addon has notice(s) on the settings page!",
			markdownless: "Does this addon have any notices on the settings page?",
		},

		presets: {
			question: "Does your addon have any presets for its settings?",
			statement: "This addon has presets for its settings!",
			markdownless: "Does this addon have any presets for its settings?",
		},

		preview: {
			question: "Does your addon have an interactive preview for its settings?",
			statement: "This addon has an interactive preview for its settings!",
			markdownless: "Does this addon have an interactive preview for its settings?",
		},

		settings: {
			question: "Does your addon have any settings?",
			statement: "This addon has settings!",
			markdownless: "Does this addon have any settings?",
		},
	},

	tags: {
		beta: {
			question: "Does your addon have the **Beta** tag?",
			statement: "This addon has the **Beta** tag!",
			markdownless: "Does this addon have the Beta tag?",
		},

		dangerous: {
			question: "Does your addon have the **Dangerous** tag?",
			statement: "This addon has the **Dangerous** tag!",
			markdownless: "Does this addon have the Dangerous tag?",
		},

		forums: {
			question: "Does your addon have the **Forums** tag?",
			statement: "This addon has the **Forums** tag!",
			markdownless: "Does this addon have the Forums tag?",
		},

		recommended: {
			question: "Does your addon have the **Recommended** tag?",
			statement: "This addon has the **Recommended** tag!",
			markdownless: "Does this addon have the Recommended tag?",
		},
	},
};
const forcedEasterEgg = "cat-blocks";

export default Object.fromEntries(
	addons.map((addon) => {
		const result: AddonQuestion[] = [];

		result.push(
			{
				dependencies: {
					...addonStartings,

					[`Does your addon’s name **start** with **${escapeMarkdown(
						addon.name[0]?.toUpperCase() ?? "",
					)}**?`]: undefined,
				},

				group: "Addon name",
				order: 1,

				question: `Does your addon’s name **start** with **${escapeMarkdown(
					addon.name[0]?.toUpperCase() ?? "",
				)}**?`,

				statement: `This addon’s name starts with **${escapeMarkdown(
					addon.name[0]?.toUpperCase() ?? "",
				)}**!`,

				markdownless: `Does this addon’s name start with ${
					addon.name[0]?.toUpperCase() ?? ""
				}?`,
			},
			{
				dependencies: {
					...addonEndings,

					[`Does your addon’s name **end** with **${escapeMarkdown(
						addon.name.at(-1)?.toUpperCase() ?? "",
					)}**?`]: undefined,
				},

				group: "Addon name",
				order: 2,

				question: `Does your addon’s name **end** with **${escapeMarkdown(
					addon.name.at(-1)?.toUpperCase() ?? "",
				)}**?`,

				statement: `This addon’s name ends with **${escapeMarkdown(
					addon.name.at(-1)?.toUpperCase() ?? "",
				)}**!`,

				markdownless: `Does this addon’s name end with ${
					addon.name.at(-1)?.toUpperCase() ?? ""
				}?`,
			},
		);

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
			case "editor": {
				result.push({
					dependencies: {
						[questionStrings.categories.themes.question]: false,
						[questionStrings.categories.website.root.question]: false,
						[questionStrings.categories.popup.question]: false,

						[questionStrings.categories.easterEgg.question]:
							forcedEasterEgg === addon.id ? undefined : false,
					},

					group: "Categorization",
					order: 10,
					question: questionStrings.categories.editor.root.question,
					statement: questionStrings.categories.editor.root.statement,
					markdownless: questionStrings.categories.editor.root.markdownless,
				});

				if (addon.tags.includes("codeEditor")) {
					result.push({
						dependencies: {
							[questionStrings.categories.editor.root.question]: true,
							[questionStrings.categories.editor.other.question]: false,
							[questionStrings.categories.editor.costumes.question]: false,
							[questionStrings.categories.editor.player.question]: false,
						},

						group: "Categorization",
						order: 11,
						question: questionStrings.categories.editor.code.question,
						statement: questionStrings.categories.editor.code.statement,
						markdownless: questionStrings.categories.editor.code.markdownless,
					});
				} else if (addon.tags.includes("costumeEditor")) {
					result.push({
						dependencies: {
							[questionStrings.categories.editor.root.question]: true,
							[questionStrings.categories.editor.code.question]: false,
							[questionStrings.categories.editor.other.question]: false,
							[questionStrings.categories.editor.player.question]: false,
						},

						group: "Categorization",
						order: 12,
						question: questionStrings.categories.editor.costumes.question,
						statement: questionStrings.categories.editor.costumes.statement,
						markdownless: questionStrings.categories.editor.costumes.markdownless,
					});
				} else if (addon.tags.includes("projectPlayer")) {
					result.push({
						dependencies: {
							[questionStrings.categories.editor.root.question]: true,
							[questionStrings.categories.editor.code.question]: false,
							[questionStrings.categories.editor.costumes.question]: false,
							[questionStrings.categories.editor.other.question]: false,
						},

						group: "Categorization",
						order: 13,
						question: questionStrings.categories.editor.player.question,
						statement: questionStrings.categories.editor.player.statement,
						markdownless: questionStrings.categories.editor.player.markdownless,
					});
				} else {
					result.push({
						dependencies: {
							[questionStrings.categories.editor.root.question]: true,
							[questionStrings.categories.editor.code.question]: false,
							[questionStrings.categories.editor.costumes.question]: false,
							[questionStrings.categories.editor.player.question]: false,
						},

						group: "Categorization",
						order: 14,
						question: questionStrings.categories.editor.other.question,
						statement: questionStrings.categories.editor.other.statement,
						markdownless: questionStrings.categories.editor.other.markdownless,
					});
				}

				break;
			}
			case "community": {
				if (addon.tags.includes("profiles")) {
					result.push({
						dependencies: {
							[questionStrings.categories.website.root.question]: true,
							[questionStrings.categories.website.other.question]: false,
							[questionStrings.categories.website.projects.question]: false,
							[questionStrings.categories.website.forums.question]: false,
						},

						group: "Categorization",
						order: 17,
						question: questionStrings.categories.website.profiles.question,
						statement: questionStrings.categories.website.profiles.statement,
						markdownless: questionStrings.categories.website.profiles.markdownless,
					});
				} else if (addon.tags.includes("projectPage")) {
					result.push({
						dependencies: {
							[questionStrings.categories.website.root.question]: true,
							[questionStrings.categories.website.profiles.question]: false,
							[questionStrings.categories.website.other.question]: false,
							[questionStrings.categories.website.forums.question]: false,
						},

						group: "Categorization",
						order: 16,
						question: questionStrings.categories.website.projects.question,
						statement: questionStrings.categories.website.projects.statement,
						markdownless: questionStrings.categories.website.projects.markdownless,
					});
				} else if (addon.tags.includes("forums")) {
					result.push({
						dependencies: {
							[questionStrings.categories.website.root.question]: true,
							[questionStrings.categories.website.profiles.question]: false,
							[questionStrings.categories.website.projects.question]: false,
							[questionStrings.categories.website.other.question]: false,
						},

						group: "Categorization",
						order: 18,
						question: questionStrings.categories.website.forums.question,
						statement: questionStrings.categories.website.forums.statement,
						markdownless: questionStrings.categories.website.forums.markdownless,
					});
				} else {
					result.push({
						dependencies: {
							[questionStrings.categories.website.root.question]: true,
							[questionStrings.categories.website.profiles.question]: false,
							[questionStrings.categories.website.projects.question]: false,
							[questionStrings.categories.website.forums.question]: false,
						},

						group: "Categorization",
						order: 19,
						question: questionStrings.categories.website.other.question,
						statement: questionStrings.categories.website.other.statement,
						markdownless: questionStrings.categories.website.other.markdownless,
					});
				}

				result.push({
					dependencies: {
						[questionStrings.categories.themes.question]: false,
						[questionStrings.categories.editor.root.question]: false,
						[questionStrings.categories.popup.question]: false,
					},

					group: "Categorization",
					order: 15,
					question: questionStrings.categories.website.root.question,
					statement: questionStrings.categories.website.root.statement,
					markdownless: questionStrings.categories.website.root.markdownless,
				});

				break;
			}
			case "theme": {
				result.push(
					{
						dependencies: {
							[questionStrings.categories.editor.root.question]: false,
							[questionStrings.categories.website.root.question]: false,
							[questionStrings.categories.popup.question]: false,

							[questionStrings.categories.easterEgg.question]:
								forcedEasterEgg === addon.id ? undefined : false,
						},

						group: "Categorization",
						order: 20,
						question: questionStrings.categories.themes.question,
						statement: questionStrings.categories.themes.statement,
						markdownless: questionStrings.categories.themes.markdownless,
					},
					{
						dependencies: {
							[questionStrings.categories.themes.question]: true,

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

						markdownless: `Is this addon listed under Themes -> ${
							addon.tags.includes("editor") ? "Editor" : "Website"
						} Themes?`,
					},
				);

				break;
			}
			case "popup": {
				result.push({
					dependencies: {
						[questionStrings.categories.themes.question]: false,
						[questionStrings.categories.editor.root.question]: false,
						[questionStrings.categories.website.root.question]: false,
					},

					group: "Categorization",
					order: 22,
					question: questionStrings.categories.popup.question,
					statement: questionStrings.categories.popup.statement,
					markdownless: questionStrings.categories.popup.markdownless,
				});

				break;
			}
			case "easterEgg": {
				result.push({
					dependencies: {
						[questionStrings.categories.themes.question]: false,
						[questionStrings.categories.popup.question]: false,
						[questionStrings.categories.editor.root.question]: false,
						[questionStrings.categories.website.root.question]: false,
					},

					group: "Categorization",
					order: 23,
					question: questionStrings.categories.easterEgg.question,
					statement: questionStrings.categories.easterEgg.statement,
					markdownless: questionStrings.categories.easterEgg.markdownless,
				});

				break;
			}
		}

		if (forcedEasterEgg === addon.id) {
			result.push({
				group: "Categorization",
				question: questionStrings.categories.easterEgg.question,
				statement: questionStrings.categories.easterEgg.statement,
				markdownless: questionStrings.categories.easterEgg.markdownless,
			});
		}

		if (addon.tags.includes("recommended")) {
			result.push({
				dependencies: {
					[questionStrings.groups.featured.question]: false,
					[questionStrings.groups.beta.question]: false,
					[questionStrings.groups.others.question]: false,
				},

				group: "Categorization",
				question: questionStrings.tags.recommended.question,
				statement: questionStrings.tags.recommended.statement,
				order: 1,
				markdownless: questionStrings.tags.recommended.markdownless,
			});
		} else if (addon.tags.includes("featured")) {
			result.push({
				dependencies: {
					[questionStrings.groups.beta.question]: false,
					[questionStrings.groups.forums.question]: false,
					[questionStrings.groups.others.question]: false,
					[questionStrings.tags.recommended.question]: false,
				},

				group: "Categorization",
				order: 5,
				question: questionStrings.groups.featured.question,
				statement: questionStrings.groups.featured.statement,
				markdownless: questionStrings.groups.featured.markdownless,
			});
		} else if (addon.tags.includes("beta") || addon.tags.includes("danger")) {
			result.push({
				dependencies: {
					[questionStrings.groups.featured.question]: false,
					[questionStrings.groups.forums.question]: false,
					[questionStrings.groups.others.question]: false,
				},

				group: "Categorization",
				order: 7,
				question: questionStrings.groups.beta.question,
				statement: questionStrings.groups.beta.statement,
				markdownless: questionStrings.groups.beta.markdownless,
			});
		} else if (addon.tags.includes("forums")) {
			result.push({
				dependencies: {
					[questionStrings.groups.featured.question]: false,
					[questionStrings.groups.beta.question]: false,
					[questionStrings.tags.forums.question]: true,
					[questionStrings.groups.others.question]: false,
				},

				group: "Categorization",
				order: 6,
				question: questionStrings.groups.forums.question,
				statement: questionStrings.groups.forums.statement,
				markdownless: questionStrings.groups.forums.markdownless,
			});
		} else {
			result.push({
				dependencies: {
					[questionStrings.groups.featured.question]: false,
					[questionStrings.groups.beta.question]: false,
					[questionStrings.groups.forums.question]: false,
					[questionStrings.tags.forums.question]: false,
				},

				group: "Categorization",
				order: 8,
				question: questionStrings.groups.others.question,
				statement: questionStrings.groups.others.statement,
				markdownless: questionStrings.groups.others.markdownless,
			});
		}

		if (addon.tags.includes("forums")) {
			result.push({
				dependencies: { [questionStrings.groups.others.question]: false },
				group: "Categorization",
				order: 2,
				question: questionStrings.tags.forums.question,
				statement: questionStrings.tags.forums.statement,
				markdownless: questionStrings.tags.forums.markdownless,
			});
		}

		if (addon.tags.includes("beta")) {
			result.push({
				dependencies: { [questionStrings.groups.beta.question]: true },
				group: "Categorization",
				order: 3,
				question: questionStrings.tags.beta.question,
				statement: questionStrings.tags.beta.statement,
				markdownless: questionStrings.tags.beta.markdownless,
			});
		}

		if (addon.tags.includes("danger")) {
			result.push({
				dependencies: { [questionStrings.groups.beta.question]: true },
				group: "Categorization",
				order: 4,
				question: questionStrings.tags.dangerous.question,
				statement: questionStrings.tags.dangerous.statement,
				markdownless: questionStrings.tags.dangerous.markdownless,
			});
		}
		const brandNew =
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.versionAdded);
		const updated =
			addon.latestUpdate &&
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.latestUpdate.version);

		if (brandNew || updated) {
			result.push({
				dependencies: {
					[questionStrings.history.new.question]: true,

					[`Is your addon found under **${
						addon.tags.includes("recommended") || addon.tags.includes("featured")
							? "Other"
							: "Featured"
					} new addons and updates** as of version ${versionMarkdown}?`]: false,
				},

				group: "Categorization",
				order: 9,

				question: `Is your addon found under **${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates** as of version ${versionMarkdown}?`,

				markdownless: `Is this addon currently found under ${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates?`,

				statement: `This addon is currently found under **${
					addon.tags.includes("recommended") || addon.tags.includes("featured")
						? "Featured"
						: "Other"
				} new addons and updates**!`,
			});
			if (brandNew) {
				result.push({
					group: "Misc",
					order: 6,
					question: questionStrings.history.new.question,
					statement: questionStrings.history.new.statement,
					markdownless: questionStrings.history.new.markdownless,
				});
			}

			if (addon.latestUpdate && updated) {
				const newTag = addon.latestUpdate.newSettings?.length
					? "New features"
					: "New settings";

				result.push(
					{
						group: "Misc",
						question: questionStrings.history.updated.question,
						statement: questionStrings.history.updated.statement,
						markdownless: questionStrings.history.updated.markdownless,
					},
					{
						dependencies: {
							[questionStrings.history.updated.question]: true,
							[`Does your addon have the **${newTag}** tag?`]: false,
						},

						group: "Misc",
						question: `Does your addon have the **${newTag}** tag?`,
						statement: `This addon has the **${newTag}** tag!`,
						markdownless: `Does this addon have the ${newTag} tag?`,
					},
				);
			}
		}

		if (addon.credits) {
			result.push(
				{
					group: "Credits",
					order: 1,
					question: questionStrings.settings.credits.question,
					statement: questionStrings.settings.credits.statement,
					markdownless: questionStrings.settings.credits.markdownless,
				},
				...addon.credits.map(
					({ name }) =>
						({
							dependencies: { [questionStrings.settings.credits.question]: true },
							group: "Credits",
							order: 2,
							question: `Did **${escapeMarkdown(name)}** contribute to your addon?`,
							statement: `**${escapeMarkdown(name)}** contributed to this addon!`,
							markdownless: `Did ${name} contribute to this addon?`,
						} as const),
				),
			);
		}

		if (addon.enabledByDefault) {
			result.push({
				group: "Misc",
				order: 1,
				question: questionStrings.settings.enabledDefault.question,
				statement: questionStrings.settings.enabledDefault.statement,
				markdownless: questionStrings.settings.enabledDefault.markdownless,
			});
		}

		if (addon.settings) {
			result.push({
				group: "Misc",
				order: 2,
				question: questionStrings.settings.settings.question,
				statement: questionStrings.settings.settings.statement,
				markdownless: questionStrings.settings.settings.markdownless,
			});
		}

		if (addon.presets) {
			result.push({
				dependencies: { [questionStrings.settings.settings.question]: true },
				group: "Misc",
				order: 3,
				question: questionStrings.settings.presets.question,
				statement: questionStrings.settings.presets.statement,
				markdownless: questionStrings.settings.presets.markdownless,
			});
		}

		if (addon.addonPreview) {
			result.push({
				dependencies: { [questionStrings.settings.settings.question]: true },
				group: "Misc",
				order: 4,
				question: questionStrings.settings.preview.question,
				statement: questionStrings.settings.preview.statement,
				markdownless: questionStrings.settings.preview.markdownless,
			});
		}

		if (addon.info) {
			result.push({
				group: "Misc",
				order: 5,
				question: questionStrings.settings.info.question,
				statement: questionStrings.settings.info.statement,
				markdownless: questionStrings.settings.info.markdownless,
			});
		}
		return [addon.id, result] as const;
	}),
);
