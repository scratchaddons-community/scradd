# Scradd

## About

Scradd is a custom all-in-one Discord bot for the [Scratch Addons (SA) server](https://discord.gg/FPv957V6SD). It has many features, such as punishments, auto moderation, “potatoboard”, XP, and much more. It also has many features specific to Scratch Addons, including addon search, suggestions, a fun game, tons of inside jokes, and more.

## Contributing

The majority of Scradd is programmed by @RedGuy12 (`cobaltt7` on Discord). Thanks to everyone with the `@Scradd Contributor` role in the SA server for help as well!

Pull requests are welcome if you would like to help contribute. Please read through the [Contributing Guidelines](/.github/CONTRIBUTING.md) if you are interested in helping out.

### Setup

#### Create a bot

1. Visit [the Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Note the “Application ID” for future use.
3. Go to the “Bot” tab and add a bot to the app.
4. Highly recommended: Disable the “Public Bot” switch so random people don’t add it to their servers.
5. Make sure to toggle all three of the Privileged Gateway Intents (the Presence, Server Members, and Message Content Intents) on.
6. Click “Reset Token” and note it for future use.

#### Set up the testing server

1. Create a new server using the [Scradd Testing server template](https://discord.new/htbTxKBq6EVp).
2. Enable Community in Server Settings. Use `#info` for the Rules or Guidelines channel and `#mod-logs` for the Community Updates Channel.
3. Enable Developer Mode under User Settings → Advanced.
4. Right-click on your new testing server, copy its ID, and note it for future use.
5. Invite your bot at https://discord.com/oauth2/authorize?client_id=[APPLICATION_ID_HERE]&guild_id=[SERVER_ID_HERE]&permissions=8&scope=applications.commands%20bot

#### Set up the repository locally

1. Download [git](https://git-scm.com) and [Node.JS](https://nodejs.org) if you haven’t already.
2. Clone the repository using the `git clone` command.
3. Install dependencies with `npm install`.
4. Set up the .env file as described in [`global.d.ts`](/common/types/global.d.ts#L45L58).
5. Code!

### File structure

This bot is built using [Strife.js](https://github.com/RedGuy12/strife.js). Please follow its style guide and structure. In addition, the `common` directory contains code used across multiple features, and the `util` directory contains utility functions used across the codebase. `util` is different from `common` as its functions are not specific to this bot but could be useful in other apps as well.

### Commands

When testing your code, it is recommended to run `npm run serve & npm run dev` to automatically build and restart the bot all in the same terminal. Before committing your code, it is necessary to run `npm run format`, then `npm run lint` and fix any lint errors, finally `npm run test` and fix any failing test, then repeat all three until no more lint errors are left. See below for a full description of all available commands:

-   To build the code once, run `npm run build`.
-   To start the bot after building the code, run `npm start`.
-   To rebuild the code on every code change, run `npm run dev`.
-   To restart the bot on every successful build, run `npm run serve`.
-   To format the code, run `npm run format`.
-   To lint the code, run `npm run lint`.
-   To unit test the code, run `npm run test`. No tests may fail when your PR is merged. If you can, we would also very much appreciate any new tests you add. We use the Node.JS native test runner for tests.
