# Scradd

## About

Scradd is a custom all-in-one Discord bot for the [Scratch Addons (SA) server](https://discord.gg/FPv957V6SD). It has many features, such as Modmail, potatoboard, auto moderation, XP, and much more. It also has many features specific to Scratch Addons, including addon search, suggestions, a fun game, tons of inside jokes, and more.

Feel free to fork Scradd to use some features in your servers.

## Contributing

The majority of Scradd is made by @RedGuy12 (`RedGuy13#5922`). Thanks to everyone with the `@Scradd Developer` role in the SA server for help as well!

Pull requests are welcome if you would like to help contribute. However, before coding new features, please discuss it with @RedGuy12 in an issue here, or the Scradd private/SA server on Discord. The issues section contains [some issues marked as "Help Wanted"](https://github.com/scratchaddons-community/scradd/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) that you may take up without asking. [See the Roadmap also.](https://github.com/orgs/scratchaddons-community/projects/1/views/1?sortedBy%5Bdirection%5D=asc&sortedBy%5BcolumnId%5D=11568385)

### Setup

#### Create a bot

1. Visit [the Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Go to the "Bot" tab and add a bot to the app.
3. Highly recommended: Disable the "Public Bot" switch so random people don't add it to their servers.
4. Make sure to toggle all three of the Privileged Gateway Intents (the Presence, Server Members, and Message Content Intents) on.
5. Click "Reset Token" and note it for future use.

#### Set up the testing server

1. Create a new server using the [Scradd Testing server template](https://discord.new/htbTxKBq6EVp).
2. Enable Community in Server Settings. Use `#rules` for the Rules or Guidelines channel and #mod-talk for the Community Updates Channel.
3. Manually create a `#potatoboard` Announcement channel inside of the `Mock` category.
4. Enable Developer Mode in your User Settings -> Advanced.
5. Right-click on your new testing server, copy its id, and note it for future use.

#### Set up the repository locally

1. Download [git](https://git-scm.com) and [Node.js](https://nodejs.org) if you haven't already.
2. Clone the repository using the `git clone` command.
3. Install dependencies with `npm install`.
4. Set up the .env file as described in [`globals.d.ts`](/common/types/globals.d.ts).
5. Code!

### File structure

`index.js` is this bots' entry point. It calls `client.js`, which initializes and exports the Discord.js `Client` object, then preforms set-up tasks. `client.js` also exports the main servers' `Guild` object for use elsewhere.

#### `events`

This directory contains files each exporting event functions that are passed to Discord.js. The event name is taken from the file path. Subfolders define camel casing. It is not recommended to create directories when they only contain one file.

#### `commands`

This directory contains files each exporting a [Command object](/common/types/command.d.ts) that are each automatically registered as an Application Command. Supports chat input commands, user context menu commands, and message context menu commands. Note that there is currently no handler for autocomplete options.

#### `common`

This directory contains functions used for a feature (like potatoboard) that are used across multiple files. The `audio` subdirectory contains audio files used in some commands. The `types` subdirectory contins types used across the codebase.

#### `lib`

This directory contains utility functions used across the codebase. It is different from `common` as its functions are not specific to this bot but could be useful in other apps as well. Each file in this directory contains multiple utility commands that each deal with the same type of data.
