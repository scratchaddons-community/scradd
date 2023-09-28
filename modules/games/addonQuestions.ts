import { escapeMessage } from "../../util/markdown.js";
import constants from "../../common/constants.js";
import addons from "../../common/extension.js";
import { trimPatchVersion } from "../../util/text.js";
import manifest from "../../extension/manifest.json" assert { type: "json" };

export const GROUP_NAMES = ["Addon name", "Categorization", "Credits", "Misc"] as const;
export type GroupName = typeof GROUP_NAMES[number];

export type Dependencies = Record<string, boolean | undefined>;
export type AddonQuestion = {
	/** Questions that, if this question is `true`, must have this answer. */
	dependencies?: Dependencies;
	/** The question to ask. Supports Markdown formatting. */
	question: `${string}?`;
	/** A statement that says this question is `true`. Supports Markdown formatting. */
	statement: `${string}!`;
};

const firstLetters = Object.fromEntries(
		addons.map(({ name }) => [
			`Does your addon’s name __start__ with **${escapeMessage(
				name[0]?.toUpperCase() ?? "",
			)}**?`,
			false,
		]),
	),
	lastLetters = Object.fromEntries(
		addons.map(({ name }) => [
			`Does your addon’s name __end__ with **${escapeMessage(
				name.at(-1)?.toUpperCase() ?? "",
			)}**?`,
			false,
		]),
	);

const versionMarkdown = `**[${escapeMessage(manifest.version_name)}](https://github.com/${
	constants.urls.saRepo
}/releases/tag/v${encodeURI(manifest.version)})**`;
const questionStrings = {
	editorCategory: "Is your addon listed under **Scratch Editor Features**?",
	codeEditorCategory: "Is your addon listed under **Scratch Editor Features** → **Code Editor**?",
	costumeEditorCategory:
		"Is your addon listed under **Scratch Editor Features** → **Costume Editor**?",
	playerEditorCategory:
		"Is your addon listed under **Scratch Editor Features** → **Project Player**?",
	otherEditorCategory: "Is your addon listed under **Scratch Editor Features** → **Others**?",

	websiteCategory: "Is your addon listed under **Scratch Website Features**?",
	projectPagesCategory:
		"Is your addon listed under **Scratch Website Features** → **Project Pages**?",
	profilesCategory: "Is your addon listed under **Scratch Website Features** → **Profiles**?",
	forumsCategory: "Is your addon listed under **Scratch Website Features** → **Forums**?",
	otherWebsiteCategory: "Is your addon listed under **Scratch Website Features** → **Others**?",

	themesCategory: "Is your addon listed under **Themes**?",
	popupCategory: "Is your addon listed under **Extension Popup Features**?",
	easterEgg: "Is your addon an easter egg addon (shown after typing the Konami code)?",

	featuredGroup: "Is your addon found under **Featured** when disabled?",
	forumsGroup: "Is your addon found under **Forums** when disabled?",
	otherGroup: "Is your addon found under **Others** when disabled?",
	betaGroup: "Is your addon found under **Beta** when disabled?",

	new: `Was your addon added in the latest version (${versionMarkdown})?`,
	updated: `Was your addon updated (not including completely new addons) in the latest version (${versionMarkdown})?`,

	credits: "Does your addon have credits listed on the settings page?",
	settings: "Does your addon have any settings?",

	recommendedTag: "Does your addon have the **Recommended** tag?",
	forumsTag: "Does your addon have the **Forums** tag?",
} as const;
const forcedEasterEgg = "cat-blocks";

export default Object.fromEntries(
	addons.map((addon) => {
		const result: AddonQuestion[] = [];

		const firstLetter = escapeMessage(addon.name[0]?.toUpperCase() ?? "");
		const lastLetter = escapeMessage(addon.name.at(-1)?.toUpperCase() ?? "");
		result.push(
			{
				dependencies: {
					...firstLetters,
					[`Does your addon’s name __start__ with **${firstLetter}**?`]: undefined,
				},

				question: `Does your addon’s name __start__ with **${firstLetter}**?`,
				statement: `This addon’s name starts with **${firstLetter}**!`,
			},
			{
				dependencies: {
					...lastLetters,
					[`Does your addon’s name __end__ with **${lastLetter}**?`]: undefined,
				},

				question: `Does your addon’s name __end__ with **${lastLetter}**?`,
				statement: `This addon’s name ends with **${lastLetter}**!`,
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
				result.push(
					{
						dependencies: {
							[questionStrings.themesCategory]: false,
							[questionStrings.websiteCategory]: false,
							[questionStrings.popupCategory]: false,

							[questionStrings.easterEgg]:
								forcedEasterEgg === addon.id ? undefined : false,
						},

						question: questionStrings.editorCategory,
						statement: "This addon is listed under **Scratch Editor Features**!",
					},
					addon.tags.includes("codeEditor")
						? {
								dependencies: {
									[questionStrings.editorCategory]: true,
									[questionStrings.otherEditorCategory]: false,
									[questionStrings.costumeEditorCategory]: false,
									[questionStrings.playerEditorCategory]: false,
								},

								question: questionStrings.codeEditorCategory,
								statement:
									"This addon is listed under **Scratch Editor Features** → **Code Editor**!",
						  }
						: addon.tags.includes("costumeEditor")
						? {
								dependencies: {
									[questionStrings.editorCategory]: true,
									[questionStrings.codeEditorCategory]: false,
									[questionStrings.otherEditorCategory]: false,
									[questionStrings.playerEditorCategory]: false,
								},

								question: questionStrings.costumeEditorCategory,
								statement:
									"This addon is listed under **Scratch Editor Features** → **Costume Editor**!",
						  }
						: addon.tags.includes("projectPlayer")
						? {
								dependencies: {
									[questionStrings.editorCategory]: true,
									[questionStrings.codeEditorCategory]: false,
									[questionStrings.costumeEditorCategory]: false,
									[questionStrings.otherEditorCategory]: false,
								},

								question: questionStrings.playerEditorCategory,
								statement:
									"This addon is listed under **Scratch Editor Features** → **Project Player**!",
						  }
						: {
								dependencies: {
									[questionStrings.editorCategory]: true,
									[questionStrings.codeEditorCategory]: false,
									[questionStrings.costumeEditorCategory]: false,
									[questionStrings.playerEditorCategory]: false,
								},

								question: questionStrings.otherEditorCategory,
								statement:
									"This addon is listed under **Scratch Editor Features** → **Others**!",
						  },
				);

				break;
			}
			case "community": {
				result.push(
					{
						dependencies: {
							[questionStrings.themesCategory]: false,
							[questionStrings.editorCategory]: false,
							[questionStrings.popupCategory]: false,
						},

						question: questionStrings.websiteCategory,
						statement: "This addon is listed under **Scratch Website Features**!",
					},
					addon.tags.includes("profiles")
						? {
								dependencies: {
									[questionStrings.websiteCategory]: true,
									[questionStrings.otherWebsiteCategory]: false,
									[questionStrings.projectPagesCategory]: false,
									[questionStrings.forumsCategory]: false,
								},

								question: questionStrings.profilesCategory,
								statement:
									"This addon is listed under **Scratch Website Features** → **Profiles**!",
						  }
						: addon.tags.includes("projectPage")
						? {
								dependencies: {
									[questionStrings.websiteCategory]: true,
									[questionStrings.profilesCategory]: false,
									[questionStrings.otherWebsiteCategory]: false,
									[questionStrings.forumsCategory]: false,
								},

								question: questionStrings.projectPagesCategory,
								statement:
									"This addon is listed under **Scratch Website Features** → **Project Pages**!",
						  }
						: addon.tags.includes("forums")
						? {
								dependencies: {
									[questionStrings.websiteCategory]: true,
									[questionStrings.profilesCategory]: false,
									[questionStrings.projectPagesCategory]: false,
									[questionStrings.otherWebsiteCategory]: false,
								},

								question: questionStrings.forumsCategory,
								statement:
									"This addon is listed under **Scratch Website Features** → **Forums**!",
						  }
						: {
								dependencies: {
									[questionStrings.websiteCategory]: true,
									[questionStrings.profilesCategory]: false,
									[questionStrings.projectPagesCategory]: false,
									[questionStrings.forumsCategory]: false,
								},

								question: questionStrings.otherWebsiteCategory,
								statement:
									"This addon is listed under **Scratch Website Features** → **Others**!",
						  },
				);

				break;
			}
			case "theme": {
				const theme = addon.tags.includes("editor") ? "Editor" : "Website";
				result.push(
					{
						dependencies: {
							[questionStrings.editorCategory]: false,
							[questionStrings.websiteCategory]: false,
							[questionStrings.popupCategory]: false,

							[questionStrings.easterEgg]:
								forcedEasterEgg === addon.id ? undefined : false,
						},

						question: questionStrings.themesCategory,
						statement: "This addon is listed under **Themes**!",
					},
					{
						dependencies: {
							[questionStrings.themesCategory]: true,

							[`Is your addon listed under **Themes** → **${
								addon.tags.includes("editor") ? "Website" : "Editor"
							} Themes**?`]: false,
						},

						question: `Is your addon listed under **Themes** → **${theme} Themes**?`,

						statement: `This addon is listed under **Themes** → **${theme} Themes**!`,
					},
				);

				break;
			}
			case "popup": {
				result.push({
					dependencies: {
						[questionStrings.themesCategory]: false,
						[questionStrings.editorCategory]: false,
						[questionStrings.websiteCategory]: false,
					},

					question: questionStrings.popupCategory,
					statement: "This addon is listed under **Extension Popup Features**!",
				});

				break;
			}
			case "easterEgg": {
				result.push({
					dependencies: {
						[questionStrings.themesCategory]: false,
						[questionStrings.popupCategory]: false,
						[questionStrings.editorCategory]: false,
						[questionStrings.websiteCategory]: false,
					},

					statement: "This addon is an easter egg addon!",
					question: questionStrings.easterEgg,
				});

				break;
			}
		}
		if (forcedEasterEgg === addon.id) {
			result.push({
				question: questionStrings.easterEgg,
				statement: "This addon is an easter egg addon!",
			});
		}

		result.push(
			addon.tags.includes("recommended")
				? {
						dependencies: {
							[questionStrings.featuredGroup]: false,
							[questionStrings.betaGroup]: false,
							[questionStrings.otherGroup]: false,
						},

						question: questionStrings.recommendedTag,
						statement: "This addon has the **Recommended** tag!",
				  }
				: addon.tags.includes("featured")
				? {
						dependencies: {
							[questionStrings.betaGroup]: false,
							[questionStrings.forumsGroup]: false,
							[questionStrings.otherGroup]: false,
							[questionStrings.recommendedTag]: false,
						},

						question: questionStrings.featuredGroup,
						statement: "This addon is found under **Featured** when disabled!",
				  }
				: addon.tags.includes("beta") || addon.tags.includes("danger")
				? {
						dependencies: {
							[questionStrings.featuredGroup]: false,
							[questionStrings.forumsGroup]: false,
							[questionStrings.otherGroup]: false,
						},

						question: questionStrings.betaGroup,
						statement: "This addon is found under **Beta** when disabled!",
				  }
				: addon.tags.includes("forums")
				? {
						dependencies: {
							[questionStrings.featuredGroup]: false,
							[questionStrings.betaGroup]: false,
							[questionStrings.forumsTag]: true,
							[questionStrings.otherGroup]: false,
						},

						question: questionStrings.forumsGroup,
						statement: "This addon is found under **Forums** when disabled!",
				  }
				: {
						dependencies: {
							[questionStrings.featuredGroup]: false,
							[questionStrings.betaGroup]: false,
							[questionStrings.forumsGroup]: false,
							[questionStrings.forumsTag]: false,
						},

						question: questionStrings.otherGroup,
						statement: "This addon is found under **Others** when disabled!",
				  },
		);

		if (addon.tags.includes("forums")) {
			result.push({
				dependencies: { [questionStrings.otherGroup]: false },
				question: questionStrings.forumsTag,
				statement: "This addon has the **Forums** tag!",
			});
		}
		if (addon.tags.includes("beta")) {
			result.push({
				dependencies: { [questionStrings.betaGroup]: true },
				question: "Does your addon have the **Beta** tag?",
				statement: "This addon has the **Beta** tag!",
			});
		}
		if (addon.tags.includes("danger")) {
			result.push({
				dependencies: { [questionStrings.betaGroup]: true },
				question: "Does your addon have the **Dangerous** tag?",
				statement: "This addon has the **Dangerous** tag!",
			});
		}

		const brandNew =
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.versionAdded);
		const updated =
			addon.latestUpdate &&
			trimPatchVersion(manifest.version) === trimPatchVersion(addon.latestUpdate.version);

		if (brandNew || updated) {
			const featured = addon.tags.includes("recommended") || addon.tags.includes("featured");
			result.push({
				dependencies: {
					[`Is your addon found under **${
						featured ? "Other" : "Featured"
					} new addons and updates** as of version ${versionMarkdown}?`]: false,
				},

				question: `Is your addon found under **${
					featured ? "Featured" : "Other"
				} new addons and updates** as of version ${versionMarkdown}?`,
				statement: `This addon is currently found under **${
					featured ? "Featured" : "Other"
				} new addons and updates**!`,
			});
			if (brandNew) {
				result.push({
					question: questionStrings.new,
					statement: "This addon was added in the latest version!",
				});
			}

			if (addon.latestUpdate && updated) {
				const newTag = addon.latestUpdate.newSettings?.length
					? "New features"
					: "New settings";

				result.push(
					{
						question: questionStrings.updated,
						statement: "This addon was updated in the latest version!",
					},
					{
						dependencies: {
							[questionStrings.updated]: true,
							[`Does your addon have the **${
								addon.latestUpdate.newSettings?.length
									? "New settings"
									: "New features"
							}** tag?`]: false,
						},

						question: `Does your addon have the **${newTag}** tag?`,
						statement: `This addon has the **${newTag}** tag!`,
					},
				);
			}
		}

		if (addon.credits) {
			result.push(
				{
					question: questionStrings.credits,
					statement: "This addon has credits listed on the settings page!",
				},
				...addon.credits.map(
					({ name }) =>
						({
							dependencies: { [questionStrings.credits]: true },
							question: `Did **${escapeMessage(name)}** contribute to your addon?`,
							statement: `**${escapeMessage(name)}** contributed to this addon!`,
						} as const),
				),
			);
		}

		if (addon.enabledByDefault) {
			result.push({
				question: "Is your addon enabled by default?",
				statement: "This addon is enabled by default!",
			});
		}

		if (addon.settings) {
			result.push({
				question: questionStrings.settings,
				statement: "This addon has settings!",
			});
		}

		if (addon.presets) {
			result.push({
				question: "Does your addon have any presets for its settings?",
				statement: "This addon has presets for its settings!",
			});
		}

		if (addon.addonPreview) {
			result.push({
				dependencies: { [questionStrings.settings]: true },
				question: "Does your addon have an interactive preview for its settings?",
				statement: "This addon has an interactive preview for its settings!",
			});
		}

		if (addon.info) {
			result.push({
				question: "Does your addon have any notices on the settings page?",
				statement: "This addon has notice(s) on the settings page!",
			});
		}
		return [addon.id, result] as const;
	}),
);
