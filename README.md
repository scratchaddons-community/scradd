# scradd

Bot for Scratch Addons Discord server

Cloud hosted on [opeNode.io](https://www.openode.io/)

## Features
### General
---
### PotatoBoard
Messages with more than 6 potato emoji reactions are shown in the #potatoboard channel.

* #### Related: /explorepotatos - Get a random message from the potatoboard.

### React to messages including certain strings 
Scradd reacts to messages that include any of the following strings with an emoji associated with the found string:

* dango, dangos, dangoes
* potato, potatos, potatoes
* griff
* amongus
* sus
* appel, appels, appeles
* tera, teras, teraes
* give you up, give up

### Commands
---
### /suggestion
Includes actions like creating, modifying and deleting suggestions.
Applies to threads in the #suggestions channel.

A suggestion looks like this:

![image](https://user-images.githubusercontent.com/75680333/152417553-31b2c407-e74b-4143-915b-5c00b76bce01.png)

### /suggestion create
Creates a new suggestion. Used in #questions-bugs-chat or #bots. Everyone can use.
### /suggestion edit
Edits the title or the content of the suggestion the command is used in the thread of. Only suggestion author can use.
### /suggestion answer
Answers the suggestion the command is used in the thread of. Requires developer or moderator permission.
A suggestion can be answered with one of the following:
  - Impractical
  - Impossible
  - Rejected
  - Good Idea
  - Implemented
  - In Development
  - Possible

### /suggestion delete
Deletes the suggestion the command is used in the thread of. Requires developer or moderator permission.

---

### /report

### /report create
Creates a new report. Used in #questions-bugs-chat or #bots. Everyone can use.
### /report edit
Edits the title or the content of the report the command is used in the thread of. Only report author can use.
### /report answer
Answers the report the command is used in the thread of. Requires developer or moderator permission.
A report can be answered with one of the following:
  - Valid Bug
  - Minor Bug
  - In Development
  - Invalid Bug
  - Fixed

### /report delete
Deletes the report the command is used in the thread of. Requires developer or moderator permission.

---

### /explorepotatos
Replies with a random message from the potatoboard.

### /addon
Replies with information about a specific addon.
* Replies with the best match if no addon found with given name.




