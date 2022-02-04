# scradd

## About

This is a Discord bot for the [Scratch Addons Discord server](https://discord.gg/Cs25kzs889). It was partially made because it was the servers' one year anniversary, and partially because we wanted a bot that we had ultimate customization over.

Logo made by @(does weirdo have a github) and @retronbv.

Cloud hosted on [opeNode.io](https://www.openode.io/).

## Features

### Potatoboard

Messages with more than 8 :potato: reactions are shown in the #potatoboard channel. If a message is funny out of context, like this: ![](https://cdn.discordapp.com/attachments/901225174974726177/939015132720287784/unknown.png) then once it gets 8 reactions, it will be posted, without context, in the #potatoboard channel. Makes for a good laugh.

Potatoboard can also be used to higlight messages that the community finds noteworthy, like a good drawing, so more people can see it.

Finally, potatoboard is useful to pick out good memes from just chatting in #memes. In the past, pins were used for this, but we had issues with the pin limit.

#### Related: /explorepotatos

The /explorepotatoes command gets a random message from the potatoboard. Optional filters can be added such as channel it was posted in, number of reactions, and/or author of the original message.

### React to messages including certain strings

Scradd reacts to some messages that include certain meme-y strings with an emoji associated with the string used. I'm not going to tell you what they are, find them yourself ![](https://cdn.discordapp.com/emojis/902948518002573364.webp?size=22&quality=lossless)!

### Suggestions

Create and manage suggestions in the #suggest channel.

A typical suggestion looks something like this: ![](https://user-images.githubusercontent.com/75680333/152417553-31b2c407-e74b-4143-915b-5c00b76bce01.png)

#### /suggestion create

Creates a new suggestion. Takes a title and a description.

#### /suggestion edit

Edits the title and/or the content of suggestions. Only the suggestion author can use it. Run it in the thread on the suggestion.

#### /suggestion answer

Answers suggestions. Requires having the developer role.

A suggestion can be answered with one of the following answers:

-   Impractical
-   Impossible
-   Rejected
-   Good Idea
-   Implemented
-   In Development
-   Possible

#### /suggestion delete

Deletes suggestions. Requires having the developer and/or moderator roles.

### Bug reports

Create and manage bug reports in the #bugs channel.

A typical report looks something like this: ![](https://cdn.discordapp.com/attachments/901225174974726177/939020057625886760/unknown.png)

### /report create

Creates a new report. Takes a title and a description.

### /report edit

Edits the title and/or the content of reports. Only the report author can use it. Run it in the thread on the report.

#### /report answer

Answers reports. Requires having the developer role.

A report can be answered with one of the following answers:

-   Valid Bug
-   Minor Bug
-   In Development
-   Invalid Bug
-   Fixed

#### /report delete

Deletes reports. Requires having the developer and/or moderator roles.

### /addon

Replies with information about a specific addon. Replies with the best match if no addon found with the given name. If no addon name is provided, replies with a ramdom addon.

