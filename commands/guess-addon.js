import {
	SlashCommandBuilder,
	Message,
	ButtonBuilder,
	SelectMenuBuilder,
	EmbedBuilder,
	escapeMarkdown,
	ButtonStyle,
	ComponentType,
	GuildMember,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	InteractionCollector,
	BaseInteraction,
} from "discord.js";
import Fuse from "fuse.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { CURRENTLY_PLAYING, checkIfUserPlaying } from "../common/games.js";
import { manifest, addons } from "../common/extension.js";
import { generateHash, trimPatchVersion } from "../lib/text.js";
import { MessageActionRowBuilder, ModalActionRowBuilder } from "../types/ActionRowBuilder.js";
import { disableComponents } from "../lib/message.js";
import addonCommandInfo from "./addon.js";

const COLLECTOR_TIME = 120_000;

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
const commandMarkdown = async (/** @type {BaseInteraction} */ interaction) =>
	`\n\n*Run the </addon:${
		(
			await interaction.client.application?.commands.fetch({
				guildId:
					addonCommandInfo.dm && process.env.NODE_ENV === "production"
						? undefined
						: interaction.guild?.id,
			})
		)?.find((command) => command.name === "addon")?.id // TODO: addonCommand.toString() (waiting on https://github.com/discordjs/discord.js/pull/8280)
	}> command for more information about this addon!*`;

export const GROUP_NAMES = /** @type {const} */ ([
	"Addon name",
	"Categorization",
	"Credits",
	"Misc",
]);

/** @typedef {typeof GROUP_NAMES[number]} GroupName */
/** @typedef {{ [key: string]: undefined | boolean }} Dependencies */
/** @typedef {{ dependencies?: Dependencies; group: GroupName; question: string; statement: string; userAsking: string; order?: number }[]} AddonQuestions */

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
const versionMarkdown = `**[${escapeMarkdown(manifest.version_name || manifest.version)}](${
	CONSTANTS.urls.saRepo
}${
	manifest.version_name?.endsWith("-prerelease")
		? ``
		: `/releases/tag/v${encodeURI(manifest.version)}`
})**`;
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
					"This addon is listed under **Scratch Editor Features** -> **Code Editor**!",
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
			question: `Was your addon added in the latest version (${versionMarkdown})?`,
			statement: "This addon was added in the latest version!",
			userAsking: "Was this addon added in the latest version?",
		},
		updated: {
			question: `Was your addon updated (not including completely new addons) in the latest version (${versionMarkdown})?`,
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
			question: "Does your addon have any notices on the settings page?",
			statement: "This addon has notice(s) on the settings page!",
			userAsking: "Does this addon have any notices on the settings page?",
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
const forcedEasterEgg = "cat-blocks";

const questionsByAddon = Object.fromEntries(
	addons.map((addon) => {
		/** @type {AddonQuestions} */
		const result = [];

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
				userAsking: `Does this addon’s name start with ${
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
				userAsking: `Does this addon’s name end with ${
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

		if (forcedEasterEgg === addon.id) {
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
			});
			if (brandNew)
				result.push({
					group: "Misc",
					order: 6,
					question: QUESTIONS.history.new.question,
					statement: QUESTIONS.history.new.statement,
					userAsking: QUESTIONS.history.new.userAsking,
				});

			if (addon.latestUpdate && updated) {
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
						userAsking: `Does this addon have the ${
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
					userAsking: QUESTIONS.settings.credits.userAsking,
				},
				...addon.credits.map(
					({ name }) =>
						/** @type {const} */ ({
							dependencies: { [QUESTIONS.settings.credits.question]: true },
							group: "Credits",
							order: 2,
							question: `Did **${escapeMarkdown(name)}** contribute to your addon?`,
							statement: `**${escapeMarkdown(name)}** contributed to this addon!`,
							userAsking: `Did ${name} contribute to this addon?`,
						}),
				),
			);
		}

		if (addon.enabledByDefault) {
			result.push({
				group: "Misc",
				order: 1,
				question: QUESTIONS.settings.enabledDefault.question,
				statement: QUESTIONS.settings.enabledDefault.statement,
				userAsking: QUESTIONS.settings.enabledDefault.userAsking,
			});
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
		return /** @type {const} */ ([addon.id, result]);
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
			(one.userAsking.toLowerCase() < two.userAsking.toLowerCase() ? -1 : 1),
	)
	.reduce((accumulator, { group, userAsking }) => {
		/** @param {number} [index] */
		function addToGroup(index = 0) {
			const accumulated = accumulator[group];

			if ((accumulated[+index]?.length || 0) < 25) {
				accumulated[+index] ??= [];
				accumulated[+index]?.push(userAsking);
				accumulator[group] = accumulated;
			} else {
				addToGroup(index + 1);
			}
		}

		addToGroup();

		return accumulator;
	}, /** @type {{ [K in GroupName]: string[][] }} */ ({ "Addon name": [], "Categorization": [], "Credits": [], "Misc": [] }));

const BULLET_POINT = CONSTANTS.footerSeperator.trim();

/**
 * @type {{
 * 	[key: string]:
 * 		| undefined
 * 		| {
 * 				collector: InteractionCollector<import("discord.js").MappedInteractionTypes[import("discord.js").MessageComponentType]>;
 * 				addon: { id: string } & import("../types/addonManifest").default;
 * 		  };
 * }}
 */
const games = {};

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Play games where you or I guess addons")
		.addSubcommand((subcommand) =>
			subcommand.setName("bot").setDescription("You think of an addon and I guess"),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("player").setDescription("I think of an addon and you guess"),
		),

	dm: true,

	async interaction(interaction) {
		if (await checkIfUserPlaying(interaction)) return;
		const command = interaction.options.getSubcommand(true);

		switch (command) {
			case "bot": {
				await reply();

				/**
				 * Determine the best question to ask next.
				 *
				 * @param {[string, number][]} addonProbabilities - The probabilities of each addon being the answer.
				 * @param {string[]} [askedQuestions] - Questions to ignore.
				 *
				 * @returns {string[]} - A new question to ask.
				 */
				function getNextQuestions(addonProbabilities, askedQuestions = []) {
					/** @type {{ [key: string]: number }} */
					const frequencies = {};

					const questions = Object.entries(questionsByAddon)
						.map(
							/** @returns {AddonQuestions[]} */
							([addon, questions]) =>
								Array.from({
									length: Math.round(
										((Array.from(addonProbabilities)
											.reverse()
											.findIndex(([id]) => id === addon) || 0) +
											1) /
											addonProbabilities.length +
											((addonProbabilities.find(
												([id]) => id === addon,
											)?.[1] || 0) +
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
						}, /** @type {typeof frequenciesArray} */ ([]))
						.map(([question]) => question);
				}
				/**
				 * Update probabilities based on an answered question.
				 *
				 * @param {string} justAsked - The question that was answered.
				 * @param {number} probabilityShift - How much to care.
				 * @param {[string, number][]} probabilitiesBefore - The probabilities of addons before this question.
				 * @param {string[]} [askedQuestions] - Questions that were already asked. This function will be modify this array.
				 *
				 * @returns {[string, number][]} - The new probabilities.
				 */
				function answerQuestion(
					justAsked,
					probabilityShift,
					probabilitiesBefore,
					askedQuestions = [],
				) {
					const justAskedQuestions = [justAsked];

					/** @type {Dependencies} */
					const dependencies = {};
					const initialUpdated = probabilitiesBefore.map(
						/** @returns {[string, number]} */ ([addonId, probability]) => {
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
								/** @type {Dependencies} */ ({}),
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
				 * @param {string[]} [askedQuestions] - Questions to ignore.
				 * @param {[string, number][]} [addonProbabilities] - Current probabilities of each addon being correct. MUST be sorted.
				 * @param {number} [askedCount] - Count of messages that have already been asked.
				 * @param {false | string | { probabilities: [string, number][]; askedQuestions: string[]; justAsked: string }} [backInfo]
				 *   - Information about the previous question.
				 *
				 *
				 * @returns {Promise<Message | undefined>} - Sent message.
				 */
				async function reply(
					askedQuestions = [],
					addonProbabilities = addons
						.map((addon) => /** @type {[string, 0]} */ ([addon.id, 0]))
						.sort(() => Math.random() - 0.5),
					askedCount = 0,
					backInfo = false,
					justAnswered = "",
				) {
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
							embeds: [new EmbedBuilder(oldMessage.embeds[0]?.toJSON())],
						});

						await oldMessage.reply(
							`🤯 You beat me! How *did* you do that? You were thinking of an actual addon, right? (Also, I only know about addons available in v${
								manifest.version_name || manifest.version
							})`,
						);

						CURRENTLY_PLAYING.delete(interaction.user.id);

						return;
					}

					const message = await interaction[oldMessage ? "editReply" : "reply"]({
						components: [
							new MessageActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setLabel("Yes")
									.setStyle(ButtonStyle.Success)
									.setCustomId(generateHash("yes")),
								new ButtonBuilder()
									.setLabel("I think so")
									.setStyle(ButtonStyle.Success)
									.setCustomId(generateHash("probably")),
								new ButtonBuilder()
									.setLabel("I don’t know")
									.setStyle(ButtonStyle.Primary)
									.setCustomId(generateHash("dontKnow")),
								new ButtonBuilder()
									.setLabel("I don’t think so")
									.setStyle(ButtonStyle.Danger)
									.setCustomId(generateHash("not")),
								new ButtonBuilder()
									.setLabel("No")
									.setStyle(ButtonStyle.Danger)
									.setCustomId(generateHash("no")),
							),
							new MessageActionRowBuilder().addComponents(
								...(typeof backInfo === "object"
									? [
											new ButtonBuilder()
												.setLabel("Back")
												.setStyle(ButtonStyle.Secondary)
												.setCustomId(generateHash("back")),
									  ]
									: []),
								new ButtonBuilder()
									.setLabel("End")
									.setStyle(ButtonStyle.Secondary)
									.setCustomId(generateHash("end")),
							),
						],

						embeds: [
							new EmbedBuilder()
								.setColor(CONSTANTS.themeColor)
								.setAuthor({
									iconURL: (interaction.member instanceof GuildMember
										? interaction.member
										: interaction.user
									).displayAvatarURL(),

									name:
										interaction.member instanceof GuildMember
											? interaction.member.displayName
											: interaction.user.username,
								})
								.setTitle("🤔 Think of an addon…")
								.setDescription(
									(oldMessage?.embeds[0]?.description
										? `${
												oldMessage?.embeds[0]?.description || ""
										  } **${justAnswered}**\n`
										: "") +
										BULLET_POINT +
										" " +
										questions[0],
								)
								.setFooter({
									text:
										oldMessage?.embeds[0]?.footer?.text.replace(
											/\d+ questions?/,
											(previousCount) =>
												`${
													1 + +(previousCount.split(" ")[0] || 0)
												} question${
													previousCount === "0 questions" ? "" : "s"
												}`,
										) ||
										`Answer my questions using the buttons below${CONSTANTS.footerSeperator}0 questions asked`,
								}),
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
									buttonInteraction.reply(`Ended the game`),
									interaction.editReply({
										components: disableComponents(message.components),

										embeds: [new EmbedBuilder(message.embeds[0]?.toJSON())],
									}),
								]);

								collector.stop();

								return;
							}

							await buttonInteraction.deferUpdate();

							if (buttonInteraction.customId.startsWith("back.")) {
								if (typeof backInfo !== "object") {
									await buttonInteraction.reply({
										content: `${CONSTANTS.emojis.statuses.no} You can’t go back here!`,
										ephemeral: true,
									});
									collector.resetTimer();

									return;
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

								collector.stop();
							} else {
								const probabilityShift = buttonInteraction.customId.startsWith(
									"yes.",
								)
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
							}
						})
						.on("end", async (collected) => {
							if (collected.size) return;

							CURRENTLY_PLAYING.delete(interaction.user.id);
							await Promise.all([
								interaction.followUp(
									`${interaction.user.toString()}, you didn’t answer my question! I’m going to end the game.`,
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
				 * @param {[string, number][]} addonProbabilities - The probabilities of each addon being correct.
				 * @param {number} askedCount - How many questions have been asked already.
				 * @param {string[]} askedQuestions - Questions that should not be asked.
				 * @param {false | string | { probabilities: [string, number][]; askedQuestions: string[]; justAsked: string }} backInfo -
				 *   Information about the previous question.
				 * @param {string} justAnswered
				 */
				async function answerWithAddon(
					addonProbabilities,
					askedCount,
					askedQuestions,
					backInfo,
					justAnswered,
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
					await oldMessage.edit({
						components: disableComponents(oldMessage.components),

						embeds: [
							new EmbedBuilder(oldMessage.embeds[0]?.toJSON()).setDescription(
								`${
									oldMessage.embeds[0]?.description || ""
										? `${
												oldMessage.embeds[0]?.description || ""
										  } **${justAnswered}**\n`
										: ""
								}${BULLET_POINT} Is it the **${foundAddon.name}** addon?`,
							),
						],
					});

					const message = await oldMessage.reply({
						components: [
							new MessageActionRowBuilder().addComponents(
								...(typeof backInfo === "object"
									? [
											new ButtonBuilder()
												.setLabel("Back")
												.setStyle(ButtonStyle.Secondary)
												.setCustomId(generateHash("back")),
									  ]
									: []),

								new ButtonBuilder()
									.setLabel("No it’s not, continue!")
									.setStyle(ButtonStyle.Primary)
									.setCustomId(generateHash("continue")),
							),
						],

						content: `<:addon:1008842100764332142> Your addon is **${escapeMarkdown(
							foundAddon.name,
						)}**!`,

						embeds: [
							new EmbedBuilder()
								.setTitle(foundAddon.name)
								.setDescription(
									`${
										Object.entries(questionsByAddon)
											.find(([id]) => id === addonProbabilities[0]?.[0])?.[1]
											?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
											.join("\n") || ""
									}${await commandMarkdown(interaction)}`,
								)
								.setAuthor({
									iconURL: (interaction.member instanceof GuildMember
										? interaction.member
										: interaction.user
									).displayAvatarURL(),

									name:
										interaction.member instanceof GuildMember
											? interaction.member.displayName
											: interaction.user.username,
								})
								.setColor(CONSTANTS.themeColor)
								.setThumbnail(
									`${CONSTANTS.urls.addonImageRoot}/${encodeURI(
										foundAddon.id,
									)}.png`,
								)
								.setURL(
									`${CONSTANTS.urls.settingsPage}#addon-${encodeURIComponent(
										foundAddon.id,
									)}`,
								)
								.setFooter({
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
								}),
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

							if (buttonInteraction.customId.startsWith("back.")) {
								if (typeof backInfo !== "object") {
									await buttonInteraction.reply({
										content: `${CONSTANTS.emojis.statuses.no} You can’t go back here!`,
										ephemeral: true,
									});
									collector.resetTimer();

									return;
								}

								await buttonInteraction.reply({
									components: [
										new MessageActionRowBuilder().addComponents(
											new ButtonBuilder()
												.setLabel("Go to game")
												.setStyle(ButtonStyle.Link)
												.setURL(oldMessage.url),
										),
									],

									ephemeral: true,
								});

								const nextMessage = await reply(
									backInfo.askedQuestions,
									backInfo.probabilities,
									askedCount - 1,
									backInfo.justAsked,
									buttonInteraction.component.label || undefined,
								);

								if (nextMessage)
									CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);

								return;
							}

							await buttonInteraction.reply({
								components: [
									new MessageActionRowBuilder().addComponents(
										new ButtonBuilder()
											.setLabel("Go to game")
											.setStyle(ButtonStyle.Link)
											.setURL(oldMessage.url),
									),
								],

								ephemeral: true,
							});

							const nextMessage = await reply(
								askedQuestions,
								addonProbabilities.slice(1),
								askedCount + 1,
								false,
								"No",
							);

							if (nextMessage)
								CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
						})
						.on("end", async () => {
							CURRENTLY_PLAYING.delete(interaction.user.id);
							await message.edit({
								components: disableComponents(message.components),

								embeds: [new EmbedBuilder(message.embeds[0]?.toJSON())],
							});
						});
				}

				break;
			}
			case "player": {
				/** @type {Set<string>} */
				const doneQuestions = new Set();

				const addon = addons[Math.floor(Math.random() * addons.length)];

				if (!addon) throw new ReferenceError("No addons exist");

				const message = await interaction.reply({
					components: [
						selectGroupButton(),
						new MessageActionRowBuilder().addComponents([
							new ButtonBuilder()
								.setLabel("Give up")
								.setStyle(ButtonStyle.Danger)
								.setCustomId(generateHash("end")),
							new ButtonBuilder()
								.setLabel("Hint")
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(generateHash("hint")),
							new ButtonBuilder()
								.setLabel("Guess")
								.setStyle(ButtonStyle.Success)
								.setCustomId(generateHash("guess")),
						]),
					],

					embeds: [
						new EmbedBuilder()
							.setColor(CONSTANTS.themeColor)
							.setAuthor({
								iconURL: (interaction.member instanceof GuildMember
									? interaction.member
									: interaction.user
								).displayAvatarURL(),

								name:
									interaction.member instanceof GuildMember
										? interaction.member.displayName
										: interaction.user.username,
							})
							.setTitle("Guess the addon!")
							.setFooter({
								text: `Pick a question for me to answer from a dropdown below${CONSTANTS.footerSeperator}0 questions asked`,
							}),
					],

					fetchReply: true,
				});

				CURRENTLY_PLAYING.set(interaction.user.id, message.url);

				const collector = message.createMessageComponentCollector({
					filter: (componentInteraction) =>
						componentInteraction.user.id === interaction.user.id,
					time: COLLECTOR_TIME,
				});
				games[interaction.user.id] = { addon, collector };

				collector
					.on("collect", async (componentInteraction) => {
						if (componentInteraction.customId.startsWith("hint.")) {
							const hint = questionsByAddon[addon.id]
								?.sort(() => Math.random() - 0.5)
								.find((question) => !doneQuestions.has(question.userAsking));

							await componentInteraction.reply({
								content: `💡 ${hint?.statement || "I don’t have a hint for you!"}`,
								ephemeral: !hint,
							});

							if (hint) await answerQuestion(hint.userAsking, hint.group);
							else {
								await message.edit({
									components: message.components?.map((row) =>
										new MessageActionRowBuilder().setComponents(
											row.components
												?.filter(
													(component) =>
														!component.customId?.startsWith("hint."),
												)
												.map((component) =>
													component.type === ComponentType.Button
														? ButtonBuilder.from(component)
														: SelectMenuBuilder.from(component),
												),
										),
									),
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
							await componentInteraction.showModal(
								new ModalBuilder()
									.setTitle("Guess the addon!")
									.setCustomId(generateHash("guessModal"))
									.addComponents(
										new ModalActionRowBuilder().addComponents(
											new TextInputBuilder()
												.setCustomId("addon")
												.setLabel("Which addon do you think it is?")
												.setRequired(true)
												.setStyle(TextInputStyle.Short),
										),
									),
							);

							return;
						}

						if (!componentInteraction.isSelectMenu())
							throw new TypeError("Unknown button pressed");

						const selected = componentInteraction.values[0] || "";
						const split = /** @type {[GroupName, string, string]} */ (
							selected.split(".")
						);
						const question = questions[split[0]][+split[1]]?.[+split[2]];

						await componentInteraction.deferUpdate();

						await answerQuestion(question, split[0]);

						collector.resetTimer();
					})
					.on("end", async (_, reason) => {
						CURRENTLY_PLAYING.delete(interaction.user.id);
						games[interaction.user.id] = undefined;

						const reply = await interaction.fetchReply();
						await Promise.all([
							reason !== "GOT_CORRECT_ANSWER" &&
								reply.reply(
									`${interaction.user.toString()}, you didn’t ask me any questions! I’m going to end the game.`,
								),
							interaction.editReply({
								components: disableComponents(reply.components),
							}),
						]);
					});
				/**
				 * @param {Set<GroupName>} doneGroups
				 * @param {GroupName} [defaultValue]
				 */
				function selectGroupButton(doneGroups = new Set(), defaultValue) {
					return new MessageActionRowBuilder().addComponents(
						new SelectMenuBuilder()
							.setPlaceholder("Select a group")
							.setCustomId(generateHash("group"))
							.setOptions(
								GROUP_NAMES.filter((group) => !doneGroups.has(group))
									.map((group) => ({
										default: group === defaultValue,
										label: group,
										value: group,
									}))
									.sort(({ label: one }, { label: two }) =>
										one === two ? 0 : one < two ? -1 : 1,
									),
							),
					);
				}
				/**
				 * @param {string | undefined} question
				 * @param {GroupName} groupName
				 */
				async function answerQuestion(question, groupName) {
					if (question) doneQuestions.add(question);

					/** @type {Set<GroupName>} */
					const doneGroups = Object.entries(questions).reduce(
						(accumulator, [group, questions]) => {
							if (
								questions.every((subQuestions) =>
									subQuestions.every((question) => doneQuestions.has(question)),
								)
							)
								accumulator.add(group);

							return accumulator;
						},
						new Set(),
					);

					const groupSelects = questions[groupName].reduce(
						(accumulator, group, selectIndex) => {
							const options = group
								.map((label, index) => ({
									label,
									value: `${groupName}.${selectIndex}.${index}`,
								}))
								.filter(({ label }) => !doneQuestions.has(label));

							const select = new SelectMenuBuilder()
								.setCustomId(generateHash(groupName))
								.setPlaceholder(
									`Select a question (${
										accumulator[0] ? "continued" : "irreversible"
									})`,
								)
								.setOptions(options);

							const row = new MessageActionRowBuilder().setComponents(select);

							if (options.length > 0) accumulator.push(row);

							return accumulator;
						},
						/** @type {MessageActionRowBuilder[]} */ ([]),
					);

					const reply = await interaction.fetchReply();
					const buttons = reply.components.at(-1);

					const foundInAddon = questionsByAddon[addon?.id || ""]?.find?.(
						({ userAsking }) => userAsking === question,
					);

					await reply.edit({
						components: [
							selectGroupButton(doneGroups, groupName),
							...(groupSelects.length > 0 ? groupSelects : []),
							...(buttons ? [buttons] : []),
						],

						embeds: question
							? [
									new EmbedBuilder(reply.embeds[0]?.toJSON())
										.setDescription(
											`${
												reply.embeds[0]?.description || ""
											}\n${BULLET_POINT} ${
												(
													foundInAddon ||
													Object.values(questionsByAddon)
														.flat()
														.find?.(
															({ userAsking }) =>
																userAsking === question,
														)
												)?.question || question
											} **${foundInAddon ? "Yes" : "No"}**`.trim(),
										)
										.setFooter({
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
										}),
							  ]
							: undefined,
					});
				}
				break;
			}
		}
	},
};

export default info;

/** @param {import("discord.js").ModalSubmitInteraction} interaction */
export async function guessAddon(interaction) {
	const game = games[interaction.user.id];
	if (!game) return;

	const query = interaction.fields.getTextInputValue("addon");
	const { item, score = 1 } = fuse.search(query)[0] ?? {};

	game.collector.resetTimer();

	if (!item || score > 0.3) {
		await interaction.reply({
			content: `${CONSTANTS.emojis.statuses.no} I couldn’t find the **${query}** addon!`,
			ephemeral: true,
		});
		return;
	}
	const editPromise = interaction.message?.edit({
		embeds: [
			new EmbedBuilder(interaction.message.embeds[0]?.toJSON())
				.setDescription(
					`${
						interaction.message.embeds[0]?.description || ""
					}\n${BULLET_POINT} Is it the **${item.name}** addon? **${
						item.id === game.addon.id ? "Yes" : "No"
					}**`.trim(),
				)
				.setFooter({
					text:
						interaction.message.embeds[0]?.footer?.text.replace(
							/\d+ questions?/,
							(previousCount) =>
								`${1 + +(previousCount.split(" ")[0] || 0)} question${
									previousCount === "0 questions" ? "" : "s"
								}`,
						) || "",
				}),
		],
	});

	if (item.id !== game.addon.id) {
		await Promise.all([
			editPromise,
			interaction.reply(
				`${CONSTANTS.emojis.statuses.no} Nope, the addon isn’t **${item.name}**…`,
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
				new EmbedBuilder()
					.setTitle(game.addon.name)
					.setDescription(
						`${
							Object.entries(questionsByAddon)
								.find(([id]) => id === game.addon.id)?.[1]
								?.map(({ statement }) => `${BULLET_POINT} ${statement}`)
								.join("\n") || ""
						}${await commandMarkdown(interaction)}`,
					)
					.setAuthor({
						iconURL: (interaction.member instanceof GuildMember
							? interaction.member
							: interaction.user
						).displayAvatarURL(),

						name:
							interaction.member instanceof GuildMember
								? interaction.member.displayName
								: interaction.user.username,
					})
					.setColor(CONSTANTS.themeColor)
					.setThumbnail(
						`${CONSTANTS.urls.addonImageRoot}/${encodeURI(game.addon.id)}.png`,
					)
					.setURL(
						`${CONSTANTS.urls.settingsPage}#addon-${encodeURIComponent(game.addon.id)}`,
					),
			],
		}),
	]);

	game.collector.stop("GOT_CORRECT_ANSWER");
}
