# scradd
![](https://cdn.discordapp.com/icons/938438560925761619/d886f0b0867e67c2211b7086c0651590.webp?size=80)
## About

Scradd is the Discord bot for the [Scratch Addons Discord server](https://discord.gg/Cs25kzs889). It was partially made because servers' one year anniversary, and partially because we wanted a bot that we had ultimate customization over.

Logo made by (Discord) Weirdo#8115 and retronbv 🥔#0795 (@retronbv on Github)

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

Create and manage suggestions in the #suggestions channel using the `/suggest` slash command <!--preferably?--> in #bots or #sa-chat.

![image](https://user-images.githubusercontent.com/75680333/175952258-9988d196-eade-4373-9294-63207f66d2af.png)


**Subcommands:** create | edit | answer | delete

A typical suggestion looks something like this: 

![](https://user-images.githubusercontent.com/75680333/152417553-31b2c407-e74b-4143-915b-5c00b76bce01.png)


#### /suggestion create

Creates a new suggestion.

| Argument | Description | Required?|
| --- | --- | --- |
| title | The title of the suggestion. Briefly explains the general idea. Can't be longer than 50 characters. | yes |
| description | Detailed description of the suggestion. Can include implementation details, the benefits, suggestions to expand on the idea, alternatives and more.| yes |
| category | The category  of the suggestion.  | yes |

A suggestion can be created in one of the following categories:

![image](https://user-images.githubusercontent.com/75680333/175952810-d639c3a6-ef4a-4c4a-9a69-32f2d2dba69c.png)

Please note that server suggestions are only here to tell new users to only suggest about extension features. Lack of it might cause misuse of the other categories to suggest features for the server and most people don't read direct info for some reason.

This feature might be available in the feature but for now it's best to suggest features for Scradd in the Scradd Discord Server, (Scratch Addons) Development Discord Server,

#### /suggestion edit

Edits the title and/or the content of suggestions. 
Can only be used by the suggestion author in the thread of the suggestion.

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

For code changes, create a [pull request](https://github.com/scratchaddons-community/scradd/pulls).

---

For feature suggestions or bug reports,
- Create an [Issue](https://github.com/scratchaddons-community/scradd/issues) (or [Discussion](https://github.com/scratchaddons-community/scradd/discussions)) on the Scradd Repository

Issues are the preferred way. Also, your suggestion will probably get more attention, discussion and more chance to be implemented if you create an issue.

You can still send a message in one of the following, though: 
- Official Discord server, #general
- Official Discord server, #general, Scradd suggestions/bugs (thread)
- Scradd Discord server, #discussion




### [Contributors](https://github.com/scratchaddons-community/scradd/graphs/contributors)
<!--![](https://contrib.rocks/image?repo=scratchaddons-community/scradd)-->

