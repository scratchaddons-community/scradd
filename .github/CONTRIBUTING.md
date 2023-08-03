# Contributing guidelines

For anyone who knows [Git](https://git-scm.com) and JavaScript basics: feel free to contribute to this repository! Our code is open source. Be sure to follow our [code of conduct](CODE_OF_CONDUCT.md). Anyone who has a meaningful pull request merged may also receive the `@Scradd Contributor` role in the Scratch Addons Discord and access to the private Scradd Testing Discord.

## General Guidelines

Please:

-   Follow [the code of conduct](CODE_OF_CONDUCT.md).
-   Stay on topic
-   Use reactions instead of meaningless comments, AKA reacting with thumbs-up instead of commenting "Good idea".

## Filing [issues](https://docs.github.com/en/github/managing-your-work-on-github/about-issues)

Feel free to report bugs and request features in an issue. Be sure to check if it is already reported by using the search bar [here](https://github.com/scratchaddons-community/scradd/issues). If there are no similar issues, you can create a new one. We will take a look at it.

## Starting [discussions](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions)

Please:

-   Choose a relevant category.
-   Mark comments that answer your question as to the answer.
-   Only use Discussions for questions, comments, and other related topics. Please don’t request new features or report bugs in Discussions; they may be closed and ignored.

## Creating [pull requests](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests)

Contributions are welcome! However, before coding new features, please discuss it with @RedGuy12 in an issue here, or the Scradd private/SA server on Discord. The [issues section](https://github.com/scratchaddons-community/scradd/issues?q=is%3Aissue+is%3Aopen) contains some things I want to happen that you may take up without asking -- just leave a comment saying you'll do it.

When you're ready to contribute, you can create a pull request. Fork this repository, create a new branch from the `main` branch, and make your changes to the new branch. Now, create a pull request on the origin repository (scratchaddons-community/scradd). We will review your pull request.

Please:

-   Minimize type errors (`npm run types`).
-   Run Prettier (`npm run format`) before pushing.
-   Write meaningful commit messages, AKA more than one word long.

### Testing code

Scradd has a couple dev commands to streamline your coding.

`npm run build`: One time build `npm run start`: Run the bot `npm run dev`: Build and watch `npm run serve`: Run the bot and restart on each successful build `npm run format`: Format code (please run this before pushing)

In my opinion, it's easiest to do `npm run serve & npm run dev`, in which case you hardly ever need to touch the terminal. But you are free to pick any combination of commands to build and run your code.
