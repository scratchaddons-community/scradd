import type { ArrayOfAtLeastOne } from "./helpers";

/** The value manipulator. */
type definitions_cssManipulator =
  | string
  | number
  | {
      /** The type of the manipulator. */
      type?: "settingValue";
      /** The setting ID to reference. */
      settingId: string;
    }
  | {
      /** The type of the manipulator. */
      type?: "ternary";
      /** The source to manipulate. */
      source: definitions_cssManipulator;
      /** The value in case the source is truthy. */
      true: Record<string, unknown> | string | number | null;
      /** The value in case the source is falsy. */
      false: Record<string, unknown> | string | number | null;
    }
  | {
      /** The type of the manipulator. */
      type?: "textColor";
      /** The source to manipulate. */
      source: definitions_cssManipulator;
      threshold: definitions_cssManipulator;
      /** The value for black text. */
      black?: definitions_cssManipulator;
      /** The value for white text. */
      white?: definitions_cssManipulator;
    }
  | {
      /** The type of the manipulator. */
      type?: "multiply" | "brighten";
      /** The source to manipulate. */
      source: definitions_cssManipulator;
      /** The red value of the color. */
      r?: number;
      /** The green value of the color. */
      g?: number;
      /** The blue value of the color. */
      b?: number;
      /** The alpha/opacity value of the color. */
      a?: number;
    }
  | {
      /** The type of the manipulator. */
      type?: "alphaBlend";
      /** The source that provides opaque color. */
      opaqueSource: definitions_cssManipulator;
      /** The source that provides transparent color. */
      transparentSource: definitions_cssManipulator;
    }
  | {
      /** The type of the manipulator. */
      type?: "recolorFilter";
      /** The source that provides the color. */
      source: definitions_cssManipulator;
    }
  | {
      /** The type of the manipulator. */
      type?: "makeHsv";
      /** The source that provides hue. */
      h: definitions_cssManipulator;
      /** The source that provides saturation. */
      s: definitions_cssManipulator;
      /** The source that provides value. */
      v: definitions_cssManipulator;
    };
/**
 * `"*"`: A match rule for any URL on Scratch origin. The script will execute
 * will execute in all pages.
 *
 * `"^..."`: A RegEx match rule. Patterns starting with https will be treated as
 * an absolute RegEx pattern, and patterns that don't start will be treated as
 * an relative RegEx pattern.
 *
 * `[...]`: An array that contains match rules. The script will execute if it
 * matches any of the rules.
 *
 * `"^..."`: A RegEx match rule. Patterns starting with https will be treated as
 * an absolute RegEx pattern, and patterns that don't start will be treated as
 * an relative RegEx pattern.
 *
 * `"projects"`, `"projectEmbeds"`, `"studios"`, `"studioComments"`,
 * `"profiles"`, `"topics"`, `"newPostScreens"`, `"editingScreens"`, `"forums"`,
 * `"scratchWWWNoProject"`: A match rule shortcut.
 *
 * `"isNotScratchWWW"`: A match rule shortcut matcher.
 *
 * `"https://..."`: A URL match rule.
 */
type definitions_matches =
  | "*"
  | `^${string}`
  | ArrayOfAtLeastOne<
      | `^${string}`
      | (
          | "projects"
          | "projectEmbeds"
          | "studios"
          | "studioComments"
          | "profiles"
          | "topics"
          | "newPostScreens"
          | "editingScreens"
          | "forums"
          | "scratchWWWNoProject"
        )
      | "isNotScratchWWW"
      | `https://${string}`
    >;

type definitions_if = {
  settings: Record<string, unknown>;
  addonEnabled: string | ArrayOfAtLeastOne<string>;
};

/**
 * Scratch Addons addon manifest.
 *
 * The manifest that describes an addon.
 */
type manifest = {
  /** The URL to the schema. */
  $schema?: string;
  /** The name of the addon. Don't make it too long. */
  name: string;
  /** The description of the addons. Any credits and attributions also belong here. */
  description: string;
  /**
   * Tags wich are used for filtering and badges on the Scratch Addons settings page.
   *
   * A tag.
   */
  tags: ArrayOfAtLeastOne<
    | "community"
    | "editor"
    | "popup"
    | "theme"
    | "beta"
    | "danger"
    | "recommended"
    | "featured"
    | "forums"
    | "easterEgg"
    | "codeEditor"
    | "costumeEditor"
    | "projectPlayer"
    | "editorMenuBar"
    | "projectPage"
    | "profiles"
    | "studios"
    | "comments"
  >;
  /**
   * You can specify permissions by providing a "permissions" array.
   *
   * A permission.
   */
  permissions?: ArrayOfAtLeastOne<"notifications" | "badge" | "clipboardWrite">;
  /**
   * You can add persistent scripts by providing a "persistentScripts" array
   * conformed of JS files (e.g. ["example.js"]).
   *
   * The path to the persistent script.
   */
  persistentScripts?: ArrayOfAtLeastOne<`${string}.js`>;
  /**
   * You can add userscripts by providing a "userscripts" array.
   *
   * Unlike persistent scripts, this is an array of objects, not strings.
   *
   * Each object must specify the url to the userscript through the "url"
   * property, and provide an array of URL matches.
   */
  userscripts?: ArrayOfAtLeastOne<{
    /** The path to the userscript. */
    url: `${string}.js`;
    matches: definitions_matches;
    /** Determines whether the addon should be run after the document is complete loading. */
    runAtComplete?: boolean;
    if?: definitions_if;
  }>;
  /**
   * Similarly to userscripts, you can specify a "userstyles" array.
   *
   * Each object must specify the url to the stylesheet through the "url"
   * property, and provide an array of URL matches.
   */
  userstyles?: ArrayOfAtLeastOne<{
    /** The path to the userstyle. */
    url: `${string}.css`;
    matches: definitions_matches;
    if?: definitions_if;
  }>;
  /**
   * The "settings" object allow the addon's users to specify settings in
   * Scratch Addons' settings panel. Inside your persistent scripts and
   * userscripts, you can then access those settings with the "addon.settings" API.
   *
   * Specify an "settings" property and provide an array of setting objects.
   */
  settings?: (
    | ({
        /** The name of the setting. */
        name: string;
        /* The identifier of the setting to get the specified value from your code. */
        id: string;
        /** The type of the setting. */
        type:
          | "boolean"
          | "positive_integer"
          | "string"
          | "select"
          | "color"
          | "integer";
        /** The default value of the setting. */
        default: boolean | number | string;
        if?: definitions_if;
      } & {
        /** The type of the setting. */
        type: "select";
        /**
         * The potential values for the select setting.
         *
         * A potential value for the select setting.
         */
        potentialValues: (
          | string
          | {
              /** The name of the potential value. */
              name: string;
              /** The identifier of the potential value. */
              id: string;
            }
        )[];
        /** The default value of the setting. */
        default: string;
      })
    | {
        /** The type of the setting. */
        type: "boolean";
        /** The default value of the setting. */
        default: boolean;
      }
    | {
        /** The type of the setting. */
        type: "positive_integer";
        /** The default value of the setting. */
        default: number;
      }
    | {
        /** The type of the setting. */
        type: "string";
        /** The default value of the setting. */
        default: string;
        /** The minimum length of the string. */
        min?: number;
        /** The maximum length of the string. */
        max?: number;
      }
    | {
        /** The type of the setting. */
        type: "color";
        /** The default value of the setting. */
        default: `#${string}`;
        /**
         * Determines whether the transparency/opacity/alpha value can be
         * changed when choosing a color.
         */
        allowTransparency?: boolean;
      }
    | {
        /** The type of the setting. */
        type: "integer";
        /** The default value of the setting. */
        default: number;
        /** The minimum value of the integer. */
        min?: number;
        /** The maximum value of the integer. */
        max?: number;
      }
  )[];
  /**
   * An array containing credits to the authors/contributors of the addon.
   *
   * A credited author/contributor.
   */
  credits?: ArrayOfAtLeastOne<{
    /** The name of the credited person. */
    name: string;
    /** The name of the credited person. */
    link?: `http${string}`;
  }>;
  /**
   * You can provide the "enabledByDefault" property and set it to true. Its
   * default value is false.
   *
   * Keep in mind, few addons will be enabled by default. If you want your addon
   * to be enabled by default, please open a discussion issue.
   */
  enabledByDefault?: boolean;
  /** An array containing presets for settings. */
  presets?: ArrayOfAtLeastOne<{
    /** The name of the preset. */
    name: string;
    /** The identifier of the preset. */
    id: string;
    /** The description of the preset. */
    description?: string;
    /** An object containing preset vlaues of the settings. */
    values: {
      [key: string]: boolean | number | string;
    };
  }>;
  /**
   * An array of libraries that the addon uses.
   *
   * A library identifier.
   */
  libraries?: ArrayOfAtLeastOne<string>;
  /**
   * An array of additional information (e.g. warnings, notices) about the addon.
   *
   * Information about the addon.
   */
  info?: ArrayOfAtLeastOne<{
    /** Type of the information. */
    type: "warning" | "notice";
    /** ID of the information. */
    id: string;
    /** Text of the information. */
    text: string;
  }>;
  popup?: {
    /** The path to the popup icon. */
    icon: string;
    /** The name of the popup. */
    name: string;
    /** Determines whether to show the fullscreen button. */
    fullscreen?: boolean;
    /** The filename of the popup page. */
    html: string;
    /** The filename of the popup script. */
    script: string;
  };
  /**
   * Determines whether the addon's scripts should be considered disabled when
   * disabled as the page is running.
   */
  dynamicDisable?: boolean;
  /**
   * Determines whether the addon's scripts should be considered enabled when
   * enabled as the page is running.
   */
  dynamicEnable?: boolean;
  /**
   * Determines whether the addon's userstyles should be injected as style
   * elements rather than link elements.
   */
  injectAsStyleElt?: boolean;
  /**
   * Determines whether the addon's userstyles should be removed and rematched
   * to the new settings.
   */
  updateUserstylesOnSettingsChange?: boolean;
  /**
   * An array of CSS variables the addon defines.
   *
   * A CSS variable.
   */
  customCssVariables?: {
    /** The name of the CSS variable. */
    name: string;
    value: definitions_cssManipulator;
    /** Whethe to drop the variable entirely when it evaluates to null. */
    dropNull?: boolean;
  }[];
  /** The version that introduced the addon. */
  versionAdded: string;
  /** The preview used for the addon. */
  addonPreview?: {
    /** The type of the preview. */ type: "editor-dark-mode";
  };
  /** The preview used for presets. */
  presetPreview?: {
    /** The type of the preview. */
    type: "pallate";
    colors?: string[];
  };
  /** The information about the latest update. */
  latestUpdate?: {
    /** The version of the update. */
    version: string;
    /** Whether to list thte addon on "Featured new addons and updates". */
    isMajor?: boolean;
    /** The notice describing the update. */
    temporaryNotice?: string;
    /** The aray of new setting IDs. */
    newSettings?: string[];
  };
};

export default manifest;
