# scradd
![](https://cdn.discordapp.com/icons/938438560925761619/d886f0b0867e67c2211b7086c0651590.webp?size=80)
## About

Scradd is the Discord bot for the [Scratch Addons Discord server](https://discord.gg/Cs25kzs889). It was partially made because servers' one year anniversary, and partially because we wanted a bot that we had ultimate customization over.

Logo made by (Discord) Weirdo#8115 and retronbv 🥔#0795

Cloud hosted on [opeNode.io](https://www.openode.io/). <!--reconsider dash?-->
<!--
## Table of Contents
 [Features](#features) | [Contributing](#contributing) 
| --- | ---
| [Potatoboard](#potatoboard) | [How to contribute](#how-to-contribute)
| [Suggestions - /suggestion](#suggestions) | [Contributors](#contributors)
| [Bug Reports - /bugreport](#bug-reports) |
| [Addon Info - /addon](#addon-addon) |
-->


## Features

### Potatoboard
  
Messages with more than 6 :potato: reactions are shown in the #potatoboard channel. 

Potatoboard can be used to higlight messages that the community finds noteworthy: like a good drawing, a good meme in #memes... or a message funny out of context like this:


![](https://cdn.discordapp.com/attachments/901225174974726177/939015132720287784/unknown.png) 


#### Related: /explorepotatos [minimum-reactions] [user] [channel]

Gets a random message from the potatoboard. 


| Argument | Description | Required?|
| --- | ---| --- |
| minimum-reactions | Minimum reactions the message needs to have | no |
| user | The author of the message | no |
| channel | The channel that the message was originally in | no |

---

### React to messages including certain strings

Scradd reacts to messages that include certain strings. 

What strings? Well... find out yourself! ![](https://cdn.discordapp.com/emojis/902948518002573364.webp?size=22&quality=lossless)

---

### Suggestions

Create and manage suggestions in the #suggestions channel.

**Subcommands:** create | edit | answer | delete

A typical suggestion looks something like this: 

![](https://user-images.githubusercontent.com/75680333/152417553-31b2c407-e74b-4143-915b-5c00b76bce01.png)


#### /suggestion create (title) (description) (category)

Creates a new suggestion.

| Argument | Required?|
| --- | --- |
| title | yes |
| description | yes |
| category | yes |

A suggestion can be created in one of the following categories:

- New Addon
- New Feature (in existing addon)
- Settings page addition
- Other


#### /suggestion edit

Edits the title and/or the content of suggestions. Only the suggestion author can use it. Run it in the thread on the suggestion.

#### /suggestion answer

Answers the suggestion it's used in the thread of. Requires having the developer role.

A suggestion can be answered with one of the following answers:

-   Impractical
-   Impossible
-   Rejected
-   Good Idea
-   Implemented
-   In Development
-   Possible

#### /suggestion delete

Deletes the suggestion it's used in the thread of. Requires having the developer and/or moderator roles.

---


### Bug Reports

Create and manage bug reports in the #bugs channel.

**Subcommands:** create | edit | answer | delete

A typical bug report looks something like this: 

![](https://cdn.discordapp.com/attachments/901225174974726177/939020057625886760/unknown.png)

### /bugreport create (title) (description)

Creates a new report.

| Argument | Required?|
| --- | --- |
| title | yes |
| description | yes|

#### /bugreport edit [content] 

Edits the title and/or the content of the report it's used in the thread of.
**Required**: Be author of the report

#### /bugreport answer

Answers the report it's used in the thread of. 
**Required**: Have Developer role

A report can be answered with one of the following answers:

-   Valid Bug
-   Minor Bug
-   In Development
-   Invalid Bug
-   Fixed

#### /bugreport delete

Deletes the report it's used in the thread of.
**Required**: Be author of the report or have Developer or Moderator role

---

### /addon [addon]

Replies with information about a specific addon. 

Replies with the best match if no addon found with the given name. Replies with a ramdom addon if no addon provided.

| Argument | Required?|
| --- | --- |
| addon | no |

---

### Modmail

**Subcommands:** start | close

#### /modmail start
Starts a new modmail ticket.
**Required**: Have Moderator role

#### /modmail close
Closes modmail ticket.
**Required**: Have Moderator role
---

## Repository Navigation
### common
Common code used by other files. Currently includes code for the Potatobard, Modmail features and the Suggestion builder.

![](https://user-images.githubusercontent.com/75680333/152847504-2f96e7ae-6d8f-407b-950c-18bfa2bd033d.png)

### commands
Independent slash commands. May import a common script. Includes all commands that appear on Scradd's slash command list.
<!--![](https://user-images.githubusercontent.com/75680333/152848021-011f3e62-a354-42c1-b5fa-6216fcc2d52b.png)-->

![](https://user-images.githubusercontent.com/75680333/152848168-ca3ab779-ad9d-40c9-acc9-1358cb1fb367.png)

### events
Scripts that are run when something happens. This can be both about the server or Scradd.

![](https://user-images.githubusercontent.com/75680333/152852754-c9dae90f-095c-40d7-a18e-cfaefff6d5e5.png)

### lib
Little helper scripts to use in other files.

![](https://user-images.githubusercontent.com/75680333/152853946-8e08f922-3ff3-4113-b2d2-9b98310a3817.png)


## Contributing

### How to contribute
For feature suggestions, create an issue or use the [/suggest command](#suggestions) in the Discord server with category argument selected as "Server / Scradd suggestions".
For bugs, create an issue or use the [/bugreport command](#bug-reports) in the Discord server.
For code changes, create a pull request.


### [Contributors](https://github.com/scratchaddons-community/scradd/graphs/contributors)
<!--![](https://contrib.rocks/image?repo=scratchaddons-community/scradd)-->


