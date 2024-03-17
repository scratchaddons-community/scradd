# Scradd

## About

Scradd is a custom all-in-one Discord bot for the [Scratch Addons (SA) server](https://discord.gg/FPv957V6SD). It has many features, such as punishments, auto moderation, “potatoboard”, XP, and much more. It also has many features specific to Scratch Addons, including addon search, suggestion utilities, fun games, tons of inside jokes, and more.

## Contributors

The majority of Scradd is programmed by @RedGuy12 (`cobaltt7` on Discord). Please run `/credits` for more information -- thanks to everyone listed on there!

Pull requests are welcome if you would like to help contribute. Please read through the [Contributing Guidelines](/.github/CONTRIBUTING.md) if you are interested in helping out.

## Setup

### Create a bot

1. Visit [the Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Note the “Application ID” for future use.
3. Go to the “Bot” tab and add a bot to the app.
4. Highly recommended: Disable the “Public Bot” switch so random people don’t add it to their servers.
5. Make sure to toggle all three of the Privileged Gateway Intents (the Presence, Server Members, and Message Content Intents) on.
6. Click “Reset Token” and note it for future use.

### Set up the testing server

1. Create a new server using the [Scradd Testing server template](https://discord.new/htbTxKBq6EVp).
2. Enable Community in Server Settings. Use `#info` for the Rules or Guidelines channel and `#mod-logs` for the Community Updates Channel.
3. Enable Developer Mode under User Settings → Advanced.
4. Right-click on your new testing server, copy its ID, and note it for future use.
5. Invite your bot at https://discord.com/oauth2/authorize?client_id=[APPLICATION_ID_HERE]&guild_id=[SERVER_ID_HERE]&permissions=8&scope=applications.commands%20bot

### Set up the repository locally

1. Download [git](https://git-scm.com) and [Node.js](https://nodejs.org) if you haven’t already.
2. Clone the repository using the `git clone` command.
3. Install dependencies with `npm install`.
4. Set up the .env file as described in [`global.d.ts`](https://github.com/search?q=repo%3Ascratchaddons-community/scradd%20ProcessEnv&type=code).
5. Code!

## Development

### File structure

This bot is built using [strife.js](https://www.npmjs.com/package/strife.js) and follows its recommended style guide and structure. In addition, the `common` directory contains code used across multiple features, and the `util` directory contains utility functions used across the codebase. `util` is different from `common` as its functions are not specific to this bot but could be useful in other apps as well.

### Commands

Scradd has a couple of dev commands to streamline your coding.

-   `npm run build`: One-time build with TypeScript
-   `npm run start`: Run the bot
-   `npm run dev`: Rebuild with TypeScript on each code change
-   `npm run serve`: Run the bot and restart with nodemon on each successful build
-   `npm run format`: Format code with Prettier
-   `npm run lint`: Lint code with ESLint
-   `npm run test`: Run unit tests with the Node.js native test runner
