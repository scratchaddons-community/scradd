import {
	Message,
	escapeMarkdown,
	ComponentType,
	GuildMember,
	InteractionCollector,
	MappedInteractionTypes,
	MessageComponentType,
	ModalSubmitInteraction,
	Snowflake,
	APIActionRowComponent,
	APISelectMenuComponent,
	Collection,
	TextInputStyle,
	ButtonStyle,
	chatInputApplicationCommandMention,
} from "discord.js";
import Fuse from "fuse.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { CURRENTLY_PLAYING, checkIfUserPlaying } from "../common/games.js";
import { manifest, addons } from "../common/extension.js";
import { generateHash, trimPatchVersion } from "../util/text.js";
import { disableComponents } from "../util/discord.js";
import type AddonManifest from "../common/types/addonManifest";
import { defineCommand } from "../common/types/command.js";

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
	(await CONSTANTS.guild.commands.fetch())?.find((command) => command.name === "addon")?.id || "",
)} command for more information about this addon!*`;

const GROUP_NAMES = ["Addon name", "Categorization", "Credits", "Misc"] as const;

type GroupName = typeof GROUP_NAMES[number];
type Dependencies = Record<string, undefined | boolean>;
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
type AddonQuestions = AddonQuestion[];

const addonStartings = Object.fromEntries(
	addons.map(({ name }) => [
		`Does your addon’s name **start** with **${escapeMarkdown(
			name[0]?.toUpperCase() || "",
		)}**?`,
		false,
	]),
);
const addonEndings = Object.fromEntries(
	addons.map(({ name }) => [
		`Does your addon’s name **end** with **${escapeMarkdown(
			name.at(-1)?.toUpperCase() || "",
		)}**?`,
		false,
	]),
);
const versionMarkdown = `**[${escapeMarkdown(
	manifest.version_name || manifest.version,
)}](https://github.com/${CONSTANTS.urls.saRepo}${
	manifest.version_name?.endsWith("-prerelease")
		? ``
		: `/releases/tag/v${encodeURI(manifest.version)}`
})**`;
const QUESTIONS = {
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

const questionsByAddon = Object.fromEntries(
	addons.map((addon) => {
		const result: AddonQuestions = [];

		result.push(
			{
				dependencies: {
					...addonStartings,
					[`Does your addon’s name **start** with **${escapeMarkdown(
						addon.name[0]?.toUpperCase() || "",
					)}**?`]: undefined,
				},
				group: "Addon name",
				order: 1,
				question: `Does your addon’s name **start** with **${escapeMarkdown(
					addon.name[0]?.toUpperCase() || "",
				)}**?`,
				statement: `This addon’s name starts with **${escapeMarkdown(
					addon.name[0]?.toUpperCase() || "",
				)}**!`,
				markdownless: `Does this addon’s name start with ${
					addon.name[0]?.toUpperCase() || ""
				}?`,
			},
			{
				dependencies: {
					...addonEndings,
					[`Does your addon’s name **end** with **${escapeMarkdown(
						addon.name.at(-1)?.toUpperCase() || "",
					)}**?`]: undefined,
				},
				group: "Addon name",
				order: 2,
				question: `Does your addon’s name **end** with **${escapeMarkdown(
					addon.name.at(-1)?.toUpperCase() || "",
				)}**?`,
				statement: `This addon’s name ends with **${escapeMarkdown(
					addon.name.at(-1)?.toUpperCase() || "",
				)}**!`,
				markdownless: `Does this addon’s name end with ${
					addon.name.at(-1)?.toUpperCase() || ""
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
						[QUESTIONS.categories.themes.question]: false,
						[QUESTIONS.categories.website.root.question]: false,
						[QUESTIONS.categories.popup.question]: false,
						[QUESTIONS.categories.easterEgg.question]:
							forcedEasterEgg === addon.id ? undefined : false,
					},

					group: "Categorization",
					order: 10,
					question: QUESTIONS.categories.editor.root.question,
					statement: QUESTIONS.categories.editor.root.statement,
					markdownless: QUESTIONS.categories.editor.root.markdownless,
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
						markdownless: QUESTIONS.categories.editor.code.markdownless,
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
						markdownless: QUESTIONS.categories.editor.costumes.markdownless,
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
						markdownless: QUESTIONS.categories.editor.player.markdownless,
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
						markdownless: QUESTIONS.categories.editor.other.markdownless,
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
						markdownless: QUESTIONS.categories.website.profiles.markdownless,
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
						markdownless: QUESTIONS.categories.website.projects.markdownless,
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
						markdownless: QUESTIONS.categories.website.forums.markdownless,
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
						markdownless: QUESTIONS.categories.website.other.markdownless,
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
					markdownless: QUESTIONS.categories.website.root.markdownless,
				});

				break;
			}
			case "theme": {
				result.push(
					{
						dependencies: {
							[QUESTIONS.categories.editor.root.question]: false,
							[QUESTIONS.categories.website.root.question]: false,
							[QUESTIONS.categories.popup.question]: false,
							[QUESTIONS.categories.easterEgg.question]:
								forcedEasterEgg === addon.id ? undefined : false,
						},
						group: "Categorization",
						order: 20,
						question: QUESTIONS.categories.themes.question,
						statement: QUESTIONS.categories.themes.statement,
						markdownless: QUESTIONS.categories.themes.markdownless,
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
						[QUESTIONS.categories.themes.question]: false,
						[QUESTIONS.categories.editor.root.question]: false,
						[QUESTIONS.categories.website.root.question]: false,
					},
					group: "Categorization",
					order: 22,
					question: QUESTIONS.categories.popup.question,
					statement: QUESTIONS.categories.popup.statement,
					markdownless: QUESTIONS.categories.popup.markdownless,
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
					markdownless: QUESTIONS.categories.easterEgg.markdownless,
				});

				break;
			}
		}

		if (forcedEasterEgg === addon.id) {
			result.push({
				group: "Categorization",
				question: QUESTIONS.categories.easterEgg.question,
				statement: QUESTIONS.categories.easterEgg.statement,
				markdownless: QUESTIONS.categories.easterEgg.markdownless,
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
				markdownless: QUESTIONS.tags.recommended.markdownless,
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
				markdownless: QUESTIONS.groups.featured.markdownless,
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
				markdownless: QUESTIONS.groups.beta.markdownless,
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
				markdownless: QUESTIONS.groups.forums.markdownless,
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
				markdownless: QUESTIONS.groups.others.markdownless,
			});
		}

		if (addon.tags.includes("forums")) {
			result.push({
				dependencies: { [QUESTIONS.groups.others.question]: false },
				group: "Categorization",
				order: 2,
				question: QUESTIONS.tags.forums.question,
				statement: QUESTIONS.tags.forums.statement,
				markdownless: QUESTIONS.tags.forums.markdownless,
			});
		}

		if (addon.tags.includes("beta")) {
			result.push({
				dependencies: { [QUESTIONS.groups.beta.question]: true },
				group: "Categorization",
				order: 3,
				question: QUESTIONS.tags.beta.question,
				statement: QUESTIONS.tags.beta.statement,
				markdownless: QUESTIONS.tags.beta.markdownless,
			});
		}

		if (addon.tags.includes("danger")) {
			result.push({
				dependencies: { [QUESTIONS.groups.beta.question]: true },
				group: "Categorization",
				order: 4,
				question: QUESTIONS.tags.dangerous.question,
				statement: QUESTIONS.tags.dangerous.statement,
				markdownless: QUESTIONS.tags.dangerous.markdownless,
			});
		}
		const brandNew =
			addon.versionAdded &&
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.versionAdded);
		const updated =
			addon.latestUpdate &&
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.latestUpdate.version);

		if (brandNew || updated) {
			result.push({
				dependencies: {
					[QUESTIONS.history.new.question]: true,
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
			if (brandNew)
				result.push({
					group: "Misc",
					order: 6,
					question: QUESTIONS.history.new.question,
					statement: QUESTIONS.history.new.statement,
					markdownless: QUESTIONS.history.new.markdownless,
				});

			if (addon.latestUpdate && updated) {
				result.push(
					{
						group: "Misc",
						question: QUESTIONS.history.updated.question,
						statement: QUESTIONS.history.updated.statement,
						markdownless: QUESTIONS.history.updated.markdownless,
					},
					{
						dependencies: {
							[QUESTIONS.history.updated.question]: true,
							[`Does your addon have the **${
								addon.latestUpdate.newSettings?.length
									? "New features"
									: "New settings"
							}** tag?`]: false,
						},
						group: "Misc",
						question: `Does your addon have the **${
							addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
						}** tag?`,
						statement: `This addon has the **${
							addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
						}** tag!`,
						markdownless: `Does this addon have the ${
							addon.latestUpdate.newSettings?.length ? "New settings" : "New features"
						} tag?`,
					},
				);
			}
		}

		if (addon.credits) {
			result.push(
				{
					group: "Credits",
					order: 1,
					question: QUESTIONS.settings.credits.question,
					statement: QUESTIONS.settings.credits.statement,
					markdownless: QUESTIONS.settings.credits.markdownless,
				},
				...addon.credits.map(
					({ name }) =>
						({
							dependencies: { [QUESTIONS.settings.credits.question]: true },
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
				question: QUESTIONS.settings.enabledDefault.question,
				statement: QUESTIONS.settings.enabledDefault.statement,
				markdownless: QUESTIONS.settings.enabledDefault.markdownless,
			});
		}

		if (addon.settings) {
			result.push({
				group: "Misc",
				order: 2,
				question: QUESTIONS.settings.settings.question,
				statement: QUESTIONS.settings.settings.statement,
				markdownless: QUESTIONS.settings.settings.markdownless,
			});
		}

		if (addon.presets) {
			result.push({
				dependencies: { [QUESTIONS.settings.settings.question]: true },
				group: "Misc",
				order: 3,
				question: QUESTIONS.settings.presets.question,
				statement: QUESTIONS.settings.presets.statement,
				markdownless: QUESTIONS.settings.presets.markdownless,
			});
		}

		if (addon.addonPreview) {
			result.push({
				dependencies: { [QUESTIONS.settings.settings.question]: true },
				group: "Misc",
				order: 4,
				question: QUESTIONS.settings.preview.question,
				statement: QUESTIONS.settings.preview.statement,
				markdownless: QUESTIONS.settings.preview.markdownless,
			});
		}

		if (addon.info) {
			result.push({
				group: "Misc",
				order: 5,
				question: QUESTIONS.settings.info.question,
				statement: QUESTIONS.settings.info.statement,
				markdownless: QUESTIONS.settings.info.markdownless,
			});
		}
		return [addon.id, result] as const;
	}),
);

const questions = Object.values(questionsByAddon)
	.flat()
	.filter(
		({ question }, index, array) =>
			!array.some((foundQuestion, id) => foundQuestion.question === question && id > index),
	)
	.sort(
		(one, two) =>
			(one.order || Number.POSITIVE_INFINITY) - (two.order || Number.POSITIVE_INFINITY) ||
			(one.markdownless.toLowerCase() < two.markdownless.toLowerCase() ? -1 : 1),
	)
	.reduce(
		(accumulator, { group, markdownless }) => {
			function addToGroup(index: number = 0) {
				const accumulated = accumulator[group];

				if ((accumulated[+index]?.length || 0) < 25) {
					accumulated[+index] ??= [];
					accumulated[+index]?.push(markdownless);
					accumulator[group] = accumulated;
				} else {
					addToGroup(index + 1);
				}
			}

			addToGroup();

			return accumulator;
		},
		{ "Addon name": [], "Categorization": [], "Credits": [], "Misc": [] } as Record<
			GroupName,
			string[][]
		>,
	);

const BULLET_POINT = CONSTANTS.footerSeperator.trim();

const games = new Collection<
	Snowflake,
	{
		collector: InteractionCollector<MappedInteractionTypes[MessageComponentType]>;
		addon: { id: string } & AddonManifest;
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
				await reply();

				/**
				 * Determine the best question to ask next.
				 *
				 * @param addonProbabilities - The probabilities of each addon being the answer.
				 * @param askedQuestions - Questions to ignore.
				 *
				 * @returns A new question to ask.
				 */
				function getNextQuestions(
					addonProbabilities: [string, number][],
					askedQuestions: string[] = [],
				): string[] {
					const frequencies: Record<string, number> = {};

					const questions = Object.entries(questionsByAddon)
						.map(([addon, questions]) =>
							Array.from<AddonQuestions>({
								length: Math.round(
									((Array.from(addonProbabilities)
										.reverse() // TODO: https://github.com/microsoft/TypeScript/pull/49636
										.findIndex(([id]) => id === addon) || 0) +
										1) /
										addonProbabilities.length +
										((addonProbabilities.find(([id]) => id === addon)?.[1] ||
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
						frequencies[`${question.question}`] ??= 0;
						frequencies[`${question.question}`]++;
					}

					const frequenciesArray = Object.entries(frequencies);

					return frequenciesArray
						.sort(() => Math.random() - 0.5)
						.reduce((previous, current, _, { length }) => {
							const currentDistance = Math.abs(current[1] / length - 0.5);
							const previousDistance = Math.abs(
								(previous[0]?.[1] || 0) / length - 0.5,
							);

							return currentDistance < previousDistance
								? current[1] < Math.round(length / 9)
									? []
									: [current]
								: currentDistance > previousDistance
								? previous
								: [...previous, current];
						}, [] as typeof frequenciesArray)
						.map(([question]) => question);
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
					probabilitiesBefore: [string, number][],
					askedQuestions: string[] = [],
				): [string, number][] {
					const justAskedQuestions = [justAsked];

					const dependencies: Dependencies = {};
					const initialUpdated = probabilitiesBefore.map(
						([addonId, probability]): [string, number] => {
							const addon = questionsByAddon[`${addonId}`] || [];
							const questionInfo = addon.find(
								({ question }) => question === justAsked,
							);

							if (probabilityShift > 0 && questionInfo?.dependencies)
								Object.assign(dependencies, questionInfo.dependencies);

							const allDependencies = addon.reduce(
								(accumulated, { dependencies: addonDependencies = {} }) => ({
									...accumulated,
									...addonDependencies,
								}),
								{} as Dependencies,
							);

							if (
								allDependencies[`${justAsked}`] !== undefined &&
								((probabilityShift > 0 && !allDependencies[`${justAsked}`]) ||
									(probabilityShift < 0 &&
										allDependencies[`${justAsked}`] !== false))
							) {
								if (addon) {
									justAskedQuestions.push(
										...addon
											.filter(({ dependencies: addonDependencies = {} }) =>
												Object.keys(addonDependencies)?.includes(justAsked),
											)
											.map(({ question }) => question),
									);
								}

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
											accumulated.sort((one, two) => two[1] - one[1]),
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
				 *
				 * @returns Sent message.
				 */
				async function reply(
					askedQuestions: string[] = [],
					addonProbabilities: [string, number][] = addons
						.map((addon) => [addon.id, 0] as [string, 0])
						.sort(() => Math.random() - 0.5),
					askedCount: number = 0,
					backInfo:
						| false
						| string
						| {
								probabilities: [string, number][];
								askedQuestions: string[];
								justAsked: string;
						  } = false,
					justAnswered = "",
				): Promise<Message | undefined> {
					const questions =
						typeof backInfo === "string"
							? [backInfo]
							: getNextQuestions(addonProbabilities, askedQuestions);

					const oldMessage = interaction.replied && (await interaction.fetchReply());

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

					if (!questions?.[0]) {
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
								manifest.version_name || manifest.version
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
								description:
									(oldMessage && oldMessage.embeds[0]?.description
										? `${oldMessage.embeds[0].description} **${justAnswered}**\n`
										: "") +
									BULLET_POINT +
									" " +
									questions[0],
								footer: {
									text:
										(oldMessage &&
											oldMessage.embeds[0]?.footer?.text.replace(
												/\d+ questions?/,
												(previousCount) =>
													`${
														1 + +(previousCount.split(" ")[0] || 0)
													} question${
														previousCount === "0 questions" ? "" : "s"
													}`,
											)) ||
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
									buttonInteraction.reply(`🛑 Ended the game`),
									interaction.editReply({
										components: disableComponents(message.components),
									}),
								]);

								collector.stop();

								return;
							}

							await buttonInteraction.deferUpdate();

							if (buttonInteraction.customId.startsWith("back.")) {
								if (typeof backInfo !== "object") {
									throw new TypeError("backInfo must be an object to go back");
								}

								const nextMessage = await reply(
									backInfo.askedQuestions,
									backInfo.probabilities,
									askedCount - 1,
									backInfo.justAsked,
									buttonInteraction.component.label || undefined,
								);

								if (nextMessage)
									CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
								else CURRENTLY_PLAYING.delete(interaction.user.id);

								return collector.stop();
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
								questions[0] || "",
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
									justAsked: questions[0] || "",
									probabilities: addonProbabilities,
								},
								buttonInteraction.component.label || "",
							);

							if (nextMessage)
								CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
							else CURRENTLY_PLAYING.delete(interaction.user.id);

							collector.stop();
						})
						.on("end", async (collected) => {
							if (collected.size) return;

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

				/**
				 * Reply to an interaction with an embed saying that the addon has been guessed and a button to keep playing.
				 *
				 * @param addonProbabilities - The probabilities of each addon being correct.
				 * @param askedCount - How many questions have been asked already.
				 * @param askedQuestions - Questions that should not be asked.
				 * @param backInfo - Information about the previous question.
				 */
				async function answerWithAddon(
					addonProbabilities: [string, number][],
					askedCount: number,
					askedQuestions: string[],
					backInfo:
						| false
						| string
						| {
								probabilities: [string, number][];
								askedQuestions: string[];
								justAsked: string;
						  },
					justAnswered: string,
				) {
					const foundAddon = addons.find(({ id }) => id === addonProbabilities[0]?.[0]);

					if (!foundAddon) {
						throw new ReferenceError(
							`Addon ${
								addonProbabilities[0]?.[0] || ""
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
									oldMessage.embeds[0]?.description || ""
										? `${
												oldMessage.embeds[0]?.description || ""
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
									Object.entries(questionsByAddon)
										.find(([id]) => id === addonProbabilities[0]?.[0])?.[1]
										?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
										.join("\n") || ""
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
									? await reply(
											backInfo.askedQuestions,
											backInfo.probabilities,
											askedCount - 1,
											backInfo.justAsked,
											buttonInteraction.component.label ?? undefined,
									  )
									: new TypeError("backInfo must be an object to go back")
								: await reply(
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
											oldMessage.embeds[0]?.description || ""
										} **Yes**`,
									},
								],
							});
						});
				}

				break;
			}
			case "player": {
				const doneQuestions = new Set<string>();

				const addon = addons[Math.floor(Math.random() * addons.length)];

				if (!addon) throw new ReferenceError("No addons exist");

				const message = await interaction.reply({
					components: [
						selectGroupButton(),
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
							const hint = questionsByAddon[addon.id]
								?.sort(() => Math.random() - 0.5)
								.find((question) => !doneQuestions.has(question.markdownless));

							await componentInteraction.reply({
								content: `💡 ${hint?.statement || "I don’t have a hint for you!"}`,
								ephemeral: !hint,
							});

							if (hint) await answerQuestion(hint.group, hint.markdownless);
							else {
								await interaction.editReply({
									components: message.components?.map((row) => ({
										type: ComponentType.ActionRow,
										components: row.components?.filter(
											(component) => !component.customId?.startsWith("hint."),
										),
									})),
								});
							}
							collector.resetTimer();

							return;
						}

						if (componentInteraction.customId.startsWith("end.")) {
							await componentInteraction.reply(
								`😦 Why did you quit? That's no fun! (PS, the addon I was thinking of was **${addon.name}**.)`,
							);

							collector.stop();

							return;
						}

						if (componentInteraction.customId.startsWith("guess.")) {
							await componentInteraction.showModal({
								title: "Guess the addon!",
								customId: generateHash("guessModal"),
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

						if (!componentInteraction.isSelectMenu())
							throw new TypeError("Unknown button pressed");

						const selected = componentInteraction.values[0] || "";
						const split = selected.split(".") as
							| [GroupName]
							| [GroupName, string, string];
						const [groupName, selectIndex, questionIndex] = split;

						if (!groupName || !GROUP_NAMES.includes(groupName))
							throw new ReferenceError("Unknown group: " + groupName);

						await componentInteraction.deferUpdate();
						collector.resetTimer();

						await answerQuestion(
							groupName,
							(selectIndex &&
								questionIndex &&
								questions[groupName as GroupName][+selectIndex]?.[
									+questionIndex
								]) ||
								undefined,
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

				function selectGroupButton(
					doneGroups: Set<GroupName> = new Set(),
					defaultValue?: GroupName,
				): APIActionRowComponent<APISelectMenuComponent> {
					return {
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.SelectMenu,
								placeholder: "Select a group",
								custom_id: generateHash("group"),
								options: GROUP_NAMES.filter((group) => !doneGroups.has(group))
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

				async function answerQuestion(groupName: GroupName, question?: string) {
					if (question) doneQuestions.add(question);

					const doneGroups = Object.entries(questions).reduce(
						(accumulator, [group, questions]) => {
							if (
								questions.every((subQuestions) =>
									subQuestions.every((question) => doneQuestions.has(question)),
								)
							)
								accumulator.add(group as GroupName);

							return accumulator;
						},
						new Set<GroupName>(),
					);

					const groupSelects = questions[groupName].reduce(
						(accumulator, group, selectIndex) => {
							const options = group
								.map((label, index) => ({
									label,
									value: `${groupName}.${selectIndex}.${index}`,
								}))
								.filter(({ label }) => !doneQuestions.has(label));

							if (options.length)
								accumulator.push({
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.SelectMenu,
											placeholder: `Select a question (${
												accumulator[0] ? "continued" : "irreversible"
											})`,
											custom_id: generateHash(groupName),
											options,
										},
									],
								});

							return accumulator;
						},
						[] as APIActionRowComponent<APISelectMenuComponent>[],
					);

					const reply = await interaction.fetchReply();
					const buttons = reply.components.at(-1);

					const foundInAddon = questionsByAddon[addon?.id || ""]?.find?.(
						({ markdownless }) => markdownless === question,
					);

					await interaction.editReply({
						components: [
							selectGroupButton(doneGroups, groupName),
							...groupSelects,
							...(buttons ? [buttons] : []),
						],

						embeds: question
							? [
									{
										...reply.embeds[0]?.toJSON(),
										description: `${
											reply.embeds[0]?.description || ""
										}\n${BULLET_POINT} ${
											(
												foundInAddon ||
												Object.values(questionsByAddon)
													.flat()
													.find?.(
														({ markdownless }) =>
															markdownless === question,
													)
											)?.question || question
										} **${foundInAddon ? "Yes" : "No"}**`.trim(),
										footer: {
											text:
												reply.embeds[0]?.footer?.text.replace(
													/\d+ questions?/,
													(previousCount) =>
														`${
															1 + +(previousCount.split(" ")[0] || 0)
														} question${
															previousCount === "0 questions"
																? ""
																: "s"
														}`,
												) || "",
										},
									},
							  ]
							: undefined,
					});
				}
				break;
			}
		}
	},
});
export default command;

export async function guessAddon(interaction: ModalSubmitInteraction) {
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
					interaction.message.embeds[0]?.description || ""
				}\n${BULLET_POINT} Is it the **${item.name}** addon? **${
					item.id === game.addon.id ? "Yes" : "No"
				}**`.trim(),
				footer: {
					text:
						interaction.message.embeds[0]?.footer?.text.replace(
							/\d+ questions?/,
							(previousCount) =>
								`${1 + +(previousCount.split(" ")[0] || 0)} question${
									previousCount === "0 questions" ? "" : "s"
								}`,
						) || "",
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
						Object.entries(questionsByAddon)
							.find(([id]) => id === game.addon.id)?.[1]
							?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
							.join("\n") || ""
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
						url: `${CONSTANTS.urls.addonImageRoot}/${encodeURI(game.addon.id)}.png`,
					},
					url: `${CONSTANTS.urls.settingsPage}#addon-${encodeURIComponent(
						game.addon.id,
					)}`,
				},
			],
		}),
	]);

	game.collector.stop();
}
