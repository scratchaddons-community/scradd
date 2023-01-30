import {
	type Message,
	escapeMarkdown,
	ComponentType,
	GuildMember,
	type InteractionCollector,
	type MappedInteractionTypes,
	type MessageComponentType,
	type Snowflake,
	type APIActionRowComponent,
	type APIStringSelectComponent,
	Collection,
	TextInputStyle,
	ButtonStyle,
	chatInputApplicationCommandMention,
} from "discord.js";
import Fuse from "fuse.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { manifest, addons } from "../common/extension.js";
import { CURRENTLY_PLAYING, checkIfUserPlaying } from "../common/games.js";
import { defineCommand } from "../common/types/command.js";
import { disableComponents } from "../util/discord.js";
import { generateHash, trimPatchVersion } from "../util/text.js";

import type AddonManifest from "../common/types/addonManifest";

const COLLECTOR_TIME = CONSTANTS.collectorTime * 4;

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{ name: "id", weight: 1 },
		{ name: "name", weight: 1 },
		{ name: "description", weight: 2 },
	],
});
const commandMarkdown = `\n\n*Run the ${chatInputApplicationCommandMention(
	"addon",
	(await CONSTANTS.guild.commands.fetch()).find((command) => command.name === "addon")?.id ?? "",
)} command for more information about this addon!*`;

// eslint-disable-next-line -- sonarjs/no-duplicate-string -- This already has types wherever it’s duplicated to prevent inconsistencies, we don’t need a rule too.
const GROUP_NAMES = ["Addon name", "Categorization", "Credits", "Misc"] as const;

type GroupName = typeof GROUP_NAMES[number];
type Dependencies = { [key: string]: boolean | undefined };
type AddonQuestion = {
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

const QUESTIONS_BY_ADDON = Object.fromEntries(
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

const QUESTIONS_BY_CATEGORY = Object.values(QUESTIONS_BY_ADDON)
	.flat()
	.filter(
		({ question }, index, array) =>
			!array.some((foundQuestion, id) => foundQuestion.question === question && id > index),
	)
	.sort(
		(one, two) =>
			(one.order ?? Number.POSITIVE_INFINITY) - (two.order ?? Number.POSITIVE_INFINITY) ||
			(one.markdownless.toLowerCase() < two.markdownless.toLowerCase() ? -1 : 1),
	)
	.reduce<{ [name in GroupName]: string[][] }>(
		(accumulator, { group, markdownless }) => {
			const accumulated = accumulator[group];

			const index =
				(accumulated.findIndex((row) => row.length < 25) + 1 || accumulated.push([])) - 1;
			accumulated[index]?.push(markdownless);
			// eslint-disable-next-line no-param-reassign -- This isn’t problematic.
			accumulator[group] = accumulated;

			return accumulator;
		},
		{ "Addon name": [], "Categorization": [], "Credits": [], "Misc": [] },
	);

const BULLET_POINT = CONSTANTS.footerSeperator.trim();

const games = new Collection<
	Snowflake,
	{
		collector: InteractionCollector<MappedInteractionTypes[MessageComponentType]>;
		addon: AddonManifest & { id: string };
	}
>();

const command = defineCommand({
	data: {
		description: "Play games where you or I guess addons",

		subcommands: {
			bot: { description: "You think of an addon and I guess" },
			player: { description: "I think of an addon and you guess" },
		},
	},

	async interaction(interaction) {
		if (await checkIfUserPlaying(interaction)) return;
		const command = interaction.options.getSubcommand(true);

		switch (command) {
			case "bot": {
				type Probability = readonly [string, number];
				type Probabilities = Probability[];

				/**
				 * Determine the best question to ask next.
				 *
				 * @param addonProbabilities - The probabilities of each addon being the answer.
				 * @param askedQuestions - Questions to ignore.
				 *
				 * @returns A new question to ask.
				 */
				function getNextQuestions(
					addonProbabilities: Probabilities,
					askedQuestions: string[] = [],
				): string[] {
					const frequencies: { [key: string]: number } = {};

					const questions = Object.entries(QUESTIONS_BY_ADDON)
						.map(([addon, questions]) =>
							Array.from<AddonQuestion[]>({
								length: Math.round(
									(Array.from(addonProbabilities)
										.reverse() // TODO: https://github.com/microsoft/TypeScript/pull/49636
										.findIndex(([id]) => id === addon) +
										1) /
										addonProbabilities.length +
										((addonProbabilities.find(([id]) => id === addon)?.[1] ??
											0) +
											1),
								),
							}).fill(
								questions.filter(
									(questionInfo) =>
										!askedQuestions.includes(questionInfo.question),
								),
							),
						)
						.flat(2);

					for (const question of questions) {
						frequencies[String(question.question)] ??= 0;
						frequencies[String(question.question)]++;
					}

					const frequenciesArray = Object.entries(frequencies);

					return frequenciesArray
						.reduce<typeof frequenciesArray>((previous, current, _, { length }) => {
							const currentDistance = Math.abs(current[1] / length - 0.5);
							const previousDistance = Math.abs(
								(previous[0]?.[1] ?? 0) / length - 0.5,
							);

							return currentDistance < previousDistance
								? current[1] < Math.round(length / 9)
									? []
									: [current]
								: currentDistance > previousDistance
								? previous
								: [...previous, current];
						}, [])
						.map(([question]) => question)
						.sort(() => Math.random() - 0.5);
				}

				/**
				 * Reply to an interaction when the addon is determined.
				 *
				 * @param addonProbabilities - The probabilities of each addon being correct.
				 * @param askedCount - How many questions have been asked already.
				 * @param askedQuestions - Questions that should not be asked.
				 * @param backInfo - Information about the previous question.
				 * @param justAnswered - The response to the previous question.
				 */
				async function answerWithAddon(
					addonProbabilities: Probabilities,
					askedCount: number,
					askedQuestions: string[],
					backInfo:
						| string
						| false
						| {
								probabilities: Probabilities;
								askedQuestions: string[];
								justAsked: string;
						  },
					justAnswered: string,
				) {
					const foundAddon = addons.find(({ id }) => id === addonProbabilities[0]?.[0]);

					if (!foundAddon) {
						throw new ReferenceError(
							`Addon ${
								addonProbabilities[0]?.[0] ?? ""
							} referenced in addonProbabilities not found in addons`,
						);
					}

					const nextChoice = addons.find(
						({ id }) => id === addonProbabilities[1]?.[0],
					)?.name;

					const oldMessage = await interaction.fetchReply();

					await interaction.editReply({
						components: disableComponents(oldMessage.components),

						embeds: [
							{
								...oldMessage.embeds[0]?.toJSON(),

								description: `${
									oldMessage.embeds[0]?.description
										? `${
												oldMessage.embeds[0]?.description ?? ""
										  } **${justAnswered}**\n`
										: ""
								}${BULLET_POINT} Is it the **${foundAddon.name}** addon?`,
							},
						],
					});

					const message = await interaction.followUp({
						components: [
							{
								type: ComponentType.ActionRow,

								components:
									typeof backInfo === "object"
										? [
												{
													type: ComponentType.Button,
													label: "Back",
													style: ButtonStyle.Secondary,
													customId: generateHash("back"),
												},
												{
													type: ComponentType.Button,
													label: "No it’s not, continue!",
													style: ButtonStyle.Primary,
													customId: generateHash("continue"),
												},
										  ]
										: [
												{
													type: ComponentType.Button,
													label: "No it’s not, continue!",
													style: ButtonStyle.Primary,
													customId: generateHash("continue"),
												},
										  ],
							},
						],

						content: `${CONSTANTS.emojis.misc.addon} Your addon is **${escapeMarkdown(
							foundAddon.name,
						)}**!`,

						embeds: [
							{
								title: foundAddon.name,

								description: `${
									Object.entries(QUESTIONS_BY_ADDON)
										.find(([id]) => id === addonProbabilities[0]?.[0])?.[1]
										?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
										.join("\n") ?? ""
								}${commandMarkdown}`,

								author: {
									icon_url: (interaction.member instanceof GuildMember
										? interaction.member
										: interaction.user
									).displayAvatarURL(),

									name:
										interaction.member instanceof GuildMember
											? interaction.member.displayName
											: interaction.user.username,
								},

								color: CONSTANTS.themeColor,

								thumbnail: {
									url: `${CONSTANTS.urls.addonImageRoot}/${encodeURI(
										foundAddon.id,
									)}.png`,
								},

								url: `${CONSTANTS.urls.settingsPage}#addon-${encodeURIComponent(
									foundAddon.id,
								)}`,

								footer: {
									text: `Guessed after ${askedCount} questions.${
										process.env.NODE_ENV === "production"
											? ""
											: `${CONSTANTS.footerSeperator}Probability: ${addonProbabilities[0]?.[1]}`
									}${
										nextChoice
											? `${
													CONSTANTS.footerSeperator
											  }Next choice: ${nextChoice}${
													process.env.NODE_ENV === "production"
														? ""
														: ` (probability ${addonProbabilities[1]?.[1]})`
											  }`
											: ""
									}`,
								},
							},
						],
					});

					CURRENTLY_PLAYING.delete(interaction.user.id);

					const collector = message.createMessageComponentCollector({
						componentType: ComponentType.Button,

						filter: (buttonInteraction) =>
							buttonInteraction.user.id === interaction.user.id,

						max: 1,
						time: CONSTANTS.collectorTime,
					});

					collector
						.on("collect", async (buttonInteraction) => {
							if (await checkIfUserPlaying(buttonInteraction)) return;

							await buttonInteraction.reply({
								components: [
									{
										type: ComponentType.ActionRow,

										components: [
											{
												type: ComponentType.Button,
												label: "Go to game",
												style: ButtonStyle.Link,
												url: oldMessage.url,
											},
										],
									},
								],

								ephemeral: true,
							});

							const nextMessage = buttonInteraction.customId.startsWith("back.")
								? typeof backInfo === "object"
									? // eslint-disable-next-line @typescript-eslint/no-use-before-define -- These functions depend on each other.
									  await reply(
											backInfo.askedQuestions,
											backInfo.probabilities,
											askedCount - 1,
											backInfo.justAsked,
											buttonInteraction.component.label ?? undefined,
									  )
									: new TypeError("backInfo must be an object to go back")
								: // eslint-disable-next-line @typescript-eslint/no-use-before-define -- These functions depend on each other.
								  await reply(
										askedQuestions,
										addonProbabilities.slice(1),
										askedCount + 1,
										false,
										"No",
								  );

							if (nextMessage) {
								if (nextMessage instanceof TypeError) throw nextMessage;
								CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
							}
						})
						.on("end", async () => {
							CURRENTLY_PLAYING.delete(interaction.user.id);
							await interaction.editReply({
								embeds: [
									{
										...oldMessage.embeds[0]?.toJSON(),

										description: `${
											oldMessage.embeds[0]?.description ?? ""
										} **Yes**`,
									},
								],
							});
						});
				}

				/**
				 * Update probabilities based on an answered question.
				 *
				 * @param justAsked - The question that was answered.
				 * @param probabilityShift - How much to care.
				 * @param probabilitiesBefore - The probabilities of addons before this question.
				 * @param askedQuestions - Questions that were already asked. This function will be modify this array.
				 *
				 * @returns The new probabilities.
				 */
				function answerQuestion(
					justAsked: string,
					probabilityShift: number,
					probabilitiesBefore: Probabilities,
					askedQuestions: string[] = [],
				): Probabilities {
					const justAskedQuestions = [justAsked];

					const dependencies: Dependencies = {};
					const initialUpdated = probabilitiesBefore.map(
						([addonId, probability]): Probability => {
							const addon = QUESTIONS_BY_ADDON[String(addonId)] ?? [];
							const questionInfo = addon.find(
								({ question }) => question === justAsked,
							);

							if (probabilityShift > 0 && questionInfo?.dependencies)
								// eslint-disable-next-line fp/no-mutating-assign -- This is meant to mutate.
								Object.assign(dependencies, questionInfo.dependencies);

							const allDependencies = addon.reduce<Dependencies>(
								(accumulated, { dependencies: addonDependencies = {} }) => ({
									...accumulated,
									...addonDependencies,
								}),
								{},
							);

							if (
								allDependencies[String(justAsked)] !== undefined &&
								((probabilityShift > 0 && !allDependencies[String(justAsked)]) ||
									(probabilityShift < 0 &&
										allDependencies[String(justAsked)] !== false))
							) {
								justAskedQuestions.push(
									...addon
										.filter(({ dependencies: addonDependencies = {} }) =>
											Object.keys(addonDependencies).includes(justAsked),
										)
										.map(({ question }) => question),
								);

								return [
									addonId,
									probability +
										(questionInfo ? probabilityShift : 0) -
										Math.abs(probabilityShift),
								];
							}

							return [addonId, probability + (questionInfo ? probabilityShift : 0)];
						},
					);

					const result = Object.entries(dependencies)
						.reduce(
							(accumulated, current) =>
								askedQuestions.includes(current[0])
									? accumulated
									: answerQuestion(
											current[0],
											(current[1] ? 1 : -1) * probabilityShift,
											Array.from(accumulated).sort(
												(one, two) => two[1] - one[1],
											),
											askedQuestions,
									  ),
							initialUpdated,
						)
						.sort((one, two) => two[1] - one[1]);

					askedQuestions.push(...justAskedQuestions);

					return result;
				}

				/**
				 * Respond to an interaction with a question.
				 *
				 * @param askedQuestions - Questions to ignore.
				 * @param addonProbabilities - Current probabilities of each addon being correct. MUST be sorted.
				 * @param askedCount - Count of messages that have already been asked.
				 * @param backInfo - Information about the previous question.
				 * @param justAnswered - The response to the previous question.
				 *
				 * @returns Sent message.
				 */
				async function reply(
					askedQuestions: string[] = [],
					addonProbabilities: Probabilities = addons
						.map((addon) => [addon.id, 0] as const)
						.sort(() => Math.random() - 0.5),
					askedCount = 0,
					backInfo:
						| string
						| false
						| {
								probabilities: Probabilities;
								askedQuestions: string[];
								justAsked: string;
						  } = false,
					justAnswered = "",
				): Promise<Message | undefined> {
					const questions =
						typeof backInfo === "string"
							? [backInfo]
							: getNextQuestions(addonProbabilities, askedQuestions);

					const oldMessage = interaction.replied
						? await interaction.fetchReply()
						: undefined;

					if ((addonProbabilities[1]?.[1] || 0) + 4 < (addonProbabilities[0]?.[1] || 0)) {
						await answerWithAddon(
							addonProbabilities,
							askedCount,
							askedQuestions,
							backInfo,
							justAnswered,
						);

						return;
					}

					if (!questions[0]) {
						if ((addonProbabilities[1]?.[1] || 0) < (addonProbabilities[0]?.[1] || 0)) {
							await answerWithAddon(
								addonProbabilities,
								askedCount,
								askedQuestions,
								backInfo,
								justAnswered,
							);

							return;
						}

						if (!oldMessage)
							throw new ReferenceError("No questions exist on initialization");

						await interaction.editReply({
							components: disableComponents(oldMessage.components),
						});

						await interaction.followUp(
							`🤯 You beat me! How *did* you do that? You were thinking of an actual addon, right? (Also, I only know about addons available in v${
								manifest.version_name ?? manifest.version
							})`,
						);

						CURRENTLY_PLAYING.delete(interaction.user.id);

						return;
					}

					const message = await interaction[interaction.replied ? "editReply" : "reply"]({
						components: [
							{
								type: ComponentType.ActionRow,

								components: [
									{
										type: ComponentType.Button,
										label: "Yes",
										style: ButtonStyle.Success,
										customId: generateHash("yes"),
									},
									{
										type: ComponentType.Button,
										label: "I think so",
										style: ButtonStyle.Success,
										customId: generateHash("probably"),
									},
									{
										type: ComponentType.Button,
										label: "I don’t know",
										style: ButtonStyle.Primary,
										customId: generateHash("dontKnow"),
									},
									{
										type: ComponentType.Button,
										label: "I don’t think so",
										style: ButtonStyle.Danger,
										customId: generateHash("not"),
									},
									{
										type: ComponentType.Button,
										label: "No",
										style: ButtonStyle.Danger,
										customId: generateHash("no"),
									},
								],
							},
							{
								type: ComponentType.ActionRow,

								components:
									typeof backInfo === "object"
										? [
												{
													type: ComponentType.Button,
													label: "Back",
													style: ButtonStyle.Secondary,
													customId: generateHash("back"),
												},
												{
													type: ComponentType.Button,
													label: "End",
													style: ButtonStyle.Secondary,
													customId: generateHash("end"),
												},
										  ]
										: [
												{
													type: ComponentType.Button,
													label: "End",
													style: ButtonStyle.Secondary,
													customId: generateHash("end"),
												},
										  ],
							},
						],

						embeds: [
							{
								color: CONSTANTS.themeColor,

								author: {
									icon_url: (interaction.member instanceof GuildMember
										? interaction.member
										: interaction.user
									).displayAvatarURL(),

									name:
										interaction.member instanceof GuildMember
											? interaction.member.displayName
											: interaction.user.username,
								},

								title: "🤔 Think of an addon…",

								description: `${
									(oldMessage?.embeds[0]?.description
										? `${oldMessage.embeds[0].description} **${justAnswered}**\n`
										: "") + BULLET_POINT
								} ${questions[0]}`,

								footer: {
									text:
										oldMessage?.embeds[0]?.footer?.text.replace(
											/\d+ questions?/,
											(previousCount) =>
												`${
													1 + Number(previousCount.split(" ")[0] ?? 0)
												} question${
													previousCount === "0 questions" ? "" : "s"
												}`,
										) ??
										`Answer my questions using the buttons below${CONSTANTS.footerSeperator}0 questions asked`,
								},
							},
						],

						fetchReply: true,
					});

					CURRENTLY_PLAYING.set(interaction.user.id, message.url);

					const collector = message.createMessageComponentCollector({
						componentType: ComponentType.Button,

						filter: (buttonInteraction) =>
							buttonInteraction.user.id === interaction.user.id,

						time: COLLECTOR_TIME,
					});

					collector
						.on("collect", async (buttonInteraction) => {
							if (buttonInteraction.customId.startsWith("end.")) {
								CURRENTLY_PLAYING.delete(interaction.user.id);
								await Promise.all([
									buttonInteraction.reply("🛑 Ended the game."),
									interaction.editReply({
										components: disableComponents(message.components),
									}),
								]);

								collector.stop();

								return;
							}

							await buttonInteraction.deferUpdate();

							if (buttonInteraction.customId.startsWith("back.")) {
								if (typeof backInfo !== "object")
									throw new TypeError("backInfo must be an object to go back");

								const nextMessage = await reply(
									backInfo.askedQuestions,
									backInfo.probabilities,
									askedCount - 1,
									backInfo.justAsked,
									buttonInteraction.component.label ?? undefined,
								);

								if (nextMessage)
									CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
								else CURRENTLY_PLAYING.delete(interaction.user.id);

								collector.stop();
								return;
							}

							const probabilityShift = buttonInteraction.customId.startsWith("yes.")
								? 2
								: buttonInteraction.customId.startsWith("probably.")
								? 1
								: buttonInteraction.customId.startsWith("not.")
								? -1
								: buttonInteraction.customId.startsWith("no.")
								? -2
								: 0;

							const previouslyAsked = Array.from(askedQuestions);
							const newProbabilities = answerQuestion(
								questions[0] ?? "",
								probabilityShift,
								addonProbabilities,
								askedQuestions,
							);

							const nextMessage = await reply(
								askedQuestions,
								newProbabilities,
								askedCount + 1,
								{
									askedQuestions: previouslyAsked,
									justAsked: questions[0] ?? "",
									probabilities: addonProbabilities,
								},
								buttonInteraction.component.label ?? "",
							);

							if (nextMessage)
								CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
							else CURRENTLY_PLAYING.delete(interaction.user.id);

							collector.stop();
						})
						.on("end", async (collected) => {
							if (collected.size > 0) return;

							CURRENTLY_PLAYING.delete(interaction.user.id);
							await Promise.all([
								interaction.followUp(
									`🛑 ${interaction.user.toString()}, you didn’t answer my question! I’m going to end the game.`,
								),
								interaction.editReply({
									components: disableComponents(message.components),
								}),
							]);
						});

					return message;
				}

				await reply();

				break;
			}
			case "player": {
				const doneQuestions = new Set<string>();
				const addon = addons[Math.floor(Math.random() * addons.length)];

				if (!addon) throw new ReferenceError("No addons exist");

				/**
				 * Generates a select menu of question groups.
				 *
				 * @param doneGroups - Groups to ignore.
				 * @param defaultValue - The group to select by default.
				 *
				 * @returns The select menus.
				 */
				function generateGroupSelect(
					doneGroups: GroupName[] = [],
					defaultValue?: GroupName,
				): APIActionRowComponent<APIStringSelectComponent> {
					return {
						type: ComponentType.ActionRow,

						components: [
							{
								type: ComponentType.StringSelect,
								placeholder: "Select a group",
								custom_id: generateHash("group"),

								options: GROUP_NAMES.filter((group) => !doneGroups.includes(group))
									.map((group) => ({
										default: group === defaultValue,
										label: group,
										value: group,
									}))
									.sort(({ label: one }, { label: two }) =>
										one.localeCompare(two),
									),
							},
						],
					};
				}

				/**
				 * Answer a question.
				 *
				 * @param groupName - The group the question is in.
				 * @param question - The question to answer. Omit to just switch to the group without answering anything.
				 */
				async function answerQuestion(groupName: GroupName, question?: string) {
					if (question) doneQuestions.add(question);

					const doneGroups = Object.entries(QUESTIONS_BY_CATEGORY).reduce<GroupName[]>(
						(accumulator, [group, questions]) => {
							if (
								questions.every((subQuestions) =>
									subQuestions.every((subQuestion) =>
										doneQuestions.has(subQuestion),
									),
								)
							)
								accumulator.push(group);

							return accumulator;
						},
						[],
					);

					const groupSelects = QUESTIONS_BY_CATEGORY[groupName].reduce<
						APIActionRowComponent<APIStringSelectComponent>[]
					>((accumulator, group, selectIndex) => {
						const options = group
							.map((label, index) => ({
								label,
								value: `${groupName}.${selectIndex}.${index}`,
							}))
							.filter(({ label }) => !doneQuestions.has(label));

						if (options.length > 0) {
							accumulator.push({
								type: ComponentType.ActionRow,

								components: [
									{
										type: ComponentType.StringSelect,

										placeholder: `Select a question (${
											accumulator[0] ? "continued" : "irreversible"
										})`,

										custom_id: generateHash(groupName),
										options,
									},
								],
							});
						}

						return accumulator;
					}, []);

					const reply = await interaction.fetchReply();
					const buttons = reply.components.at(-1);

					const foundInAddon = QUESTIONS_BY_ADDON[addon?.id ?? ""]?.find(
						({ markdownless }) => markdownless === question,
					);

					await interaction.editReply({
						components: [
							generateGroupSelect(doneGroups, groupName),
							...groupSelects,
							...(buttons ? [buttons] : []),
						],

						embeds: question
							? [
									{
										...reply.embeds[0]?.toJSON(),

										description: `${
											reply.embeds[0]?.description ?? ""
										}\n${BULLET_POINT} ${
											(
												foundInAddon ??
												Object.values(QUESTIONS_BY_ADDON)
													.flat()
													.find(
														({ markdownless }) =>
															markdownless === question,
													)
											)?.question ?? question
										} **${foundInAddon ? "Yes" : "No"}**`.trim(),

										footer: {
											text:
												reply.embeds[0]?.footer?.text.replace(
													/\d+ questions?/,
													(previousCount) =>
														`${
															1 +
															Number(previousCount.split(" ")[0] ?? 0)
														} question${
															previousCount === "0 questions"
																? ""
																: "s"
														}`,
												) ?? "",
										},
									},
							  ]
							: undefined,
					});
				}

				const message = await interaction.reply({
					components: [
						generateGroupSelect(),
						{
							type: ComponentType.ActionRow,

							components: [
								{
									type: ComponentType.Button,
									label: "Give up",
									style: ButtonStyle.Danger,
									customId: generateHash("end"),
								},
								{
									type: ComponentType.Button,
									label: "Hint",
									style: ButtonStyle.Secondary,
									customId: generateHash("hint"),
								},
								{
									type: ComponentType.Button,
									label: "Guess",
									style: ButtonStyle.Success,
									customId: generateHash("guess"),
								},
							],
						},
					],

					embeds: [
						{
							color: CONSTANTS.themeColor,

							author: {
								icon_url: (interaction.member instanceof GuildMember
									? interaction.member
									: interaction.user
								).displayAvatarURL(),

								name:
									interaction.member instanceof GuildMember
										? interaction.member.displayName
										: interaction.user.username,
							},

							title: "Guess the addon!",

							footer: {
								text: `Pick a question for me to answer from a dropdown below${CONSTANTS.footerSeperator}0 questions asked`,
							},
						},
					],

					fetchReply: true,
				});

				CURRENTLY_PLAYING.set(interaction.user.id, message.url);

				const collector = message.createMessageComponentCollector({
					filter: (componentInteraction) =>
						componentInteraction.user.id === interaction.user.id,

					time: COLLECTOR_TIME,
				});
				games.set(interaction.user.id, { addon, collector });

				collector
					.on("collect", async (componentInteraction) => {
						if (componentInteraction.customId.startsWith("hint.")) {
							const hint = [...(QUESTIONS_BY_ADDON[addon.id] ?? [])]
								.sort(() => Math.random() - 0.5)
								.find((question) => !doneQuestions.has(question.markdownless));

							await componentInteraction.reply({
								content: `💡 ${hint?.statement ?? "I don’t have a hint for you!"}`,
								ephemeral: !hint,
							});

							await (hint
								? answerQuestion(hint.group, hint.markdownless)
								: interaction.editReply({
										components: message.components.map((row) => ({
											type: ComponentType.ActionRow,

											components: row.components.filter(
												(component) =>
													!component.customId?.startsWith("hint."),
											),
										})),
								  }));
							collector.resetTimer();

							return;
						}

						if (componentInteraction.customId.startsWith("end.")) {
							await componentInteraction.reply(
								`😦 Why did you quit? That’s no fun! (PS, the addon I was thinking of was **${addon.name}**.)`,
							);

							collector.stop();

							return;
						}

						if (componentInteraction.customId.startsWith("guess.")) {
							await componentInteraction.showModal({
								title: "Guess the addon!",
								customId: "_guessModal",

								components: [
									{
										type: ComponentType.ActionRow,

										components: [
											{
												type: ComponentType.TextInput,
												customId: "addon",
												label: "Which addon do you think it is?",
												required: true,
												style: TextInputStyle.Short,
											},
										],
									},
								],
							});

							return;
						}

						if (!componentInteraction.isStringSelectMenu())
							throw new TypeError("Unknown button pressed");

						const selected = componentInteraction.values[0] ?? "";
						const [groupName, selectIndex, questionIndex] = selected.split(".");

						if (!groupName || !GROUP_NAMES.includes(groupName))
							throw new ReferenceError(`Unknown group: ${groupName}`);

						await componentInteraction.deferUpdate();
						collector.resetTimer();

						await answerQuestion(
							groupName,
							selectIndex &&
								questionIndex &&
								QUESTIONS_BY_CATEGORY[groupName][Number(selectIndex)]?.[
									Number(questionIndex)
								],
						);
					})
					.on("end", async (_, reason) => {
						CURRENTLY_PLAYING.delete(interaction.user.id);
						games.delete(interaction.user.id);

						const reply = await interaction.fetchReply();
						await Promise.all([
							reason === "time" &&
								interaction.followUp(
									`🛑 ${interaction.user.toString()}, you didn’t ask me any questions! I’m going to end the game.`,
								),
							interaction.editReply({
								components: disableComponents(reply.components),
							}),
						]);
					});
				break;
			}
		}
	},

	modals: {
		async guessModal(interaction) {
			const game = games.get(interaction.user.id);
			if (!game) return;

			const query = interaction.fields.getTextInputValue("addon");
			const { item, score = 1 } = fuse.search(query)[0] ?? {};

			game.collector.resetTimer();

			if (!item || score > 0.3) {
				await interaction.reply({
					content: `${CONSTANTS.emojis.statuses.no} Could not find the **${query}** addon!`,
					ephemeral: true,
				});
				return;
			}
			const editPromise = interaction.message?.edit({
				embeds: [
					{
						...interaction.message.embeds[0]?.toJSON(),

						description: `${
							interaction.message.embeds[0]?.description ?? ""
						}\n${BULLET_POINT} Is it the **${item.name}** addon? **${
							item.id === game.addon.id ? "Yes" : "No"
						}**`.trim(),

						footer: {
							text:
								interaction.message.embeds[0]?.footer?.text.replace(
									/\d+ questions?/,
									(previousCount) =>
										`${1 + Number(previousCount.split(" ")[0] ?? 0)} question${
											previousCount === "0 questions" ? "" : "s"
										}`,
								) ?? "",
						},
					},
				],
			});

			if (item.id !== game.addon.id) {
				await Promise.all([
					editPromise,
					interaction.reply(
						`${CONSTANTS.emojis.statuses.no} Nope, the addon is not **${item.name}**…`,
					),
				]);
				return;
			}

			await Promise.all([
				editPromise,
				interaction.reply({
					content: `${CONSTANTS.emojis.statuses.yes} The addon *is* **${escapeMarkdown(
						game.addon.name,
					)}**! You got it right!`,

					embeds: [
						{
							title: game.addon.name,

							description: `${
								Object.entries(QUESTIONS_BY_ADDON)
									.find(([id]) => id === game.addon.id)?.[1]
									?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
									.join("\n") ?? ""
							}${commandMarkdown}`,

							author: {
								icon_url: (interaction.member instanceof GuildMember
									? interaction.member
									: interaction.user
								).displayAvatarURL(),

								name:
									interaction.member instanceof GuildMember
										? interaction.member.displayName
										: interaction.user.username,
							},

							color: CONSTANTS.themeColor,

							thumbnail: {
								url: `${CONSTANTS.urls.addonImageRoot}/${encodeURI(
									game.addon.id,
								)}.png`,
							},

							url: `${CONSTANTS.urls.settingsPage}#addon-${encodeURIComponent(
								game.addon.id,
							)}`,
						},
					],
				}),
			]);

			game.collector.stop();
		},
	},
});
export default command;
