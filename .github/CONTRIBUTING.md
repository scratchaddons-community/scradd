# Contributing guidelines

For anyone who knows [Git](https://git-scm.com) and JavaScript basics: feel free to contribute to this repository! Our code is open source. Be sure to follow our [code of conduct](CODE_OF_CONDUCT.md). Anyone who has a meaningful pull request merged may also receive one or more of the following:

-   `@Scradd Contributor` role in the Scratch Addons server
-   access to the private Scradd Testing server
-   credit under `/info credits`

## General Guidelines

Please:

-   Follow [the code of conduct](CODE_OF_CONDUCT.md).
-   Stay on topic
-   Use reactions instead of meaningless comments, AKA reacting with thumbs-up instead of commenting “Good idea”.

## Filing [issues](https://docs.github.com/en/github/managing-your-work-on-github/about-issues)

Feel free to report bugs and request features in an issue. Be sure to check if it is already reported by using the search bar [here](https://github.com/scratchaddons-community/scradd/issues). If there are no similar issues, you can create a new one. We will take a look at it.

## Starting [discussions](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions)

Please:

-   Choose a relevant category.
-   Mark comments that answer your question as to the answer.
-   Only use Discussions for questions, comments, and other related topics. Please don’t request new features or report bugs in Discussions.

## Creating [pull requests](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests)

Contributions are welcome! However, before coding new features, please discuss it with cobalt, whether that be in an issue here or somewhere on Discord. The [issues section](https://github.com/scratchaddons-community/scradd/issues?q=is%3Aissue+is%3Aopen) contains some things I want to happen that you may take up without asking -- just leave a comment saying you’ll do it.

When you’re ready to contribute, you can create a pull request. Fork this repository, create a new branch from the `main` branch, and make your changes to the new branch. Now, create a pull request on the origin repository (scratchaddons-community/scradd). We will review your pull request.

Please:

-   Verify that your code successfully builds by running `npm run build`.
-   Run Prettier using `npm run format` before pushing. If you don’t, it may be run automatically in the workflow.
-   Lint your code using `npm run lint`. No lint errors may be present when your PR is merged. Warnings may be allowed depending on the context. Some lint errors may be fixed automatically with `npm run lint -- --fix`, but it is important to manually confirm it worked as intended. The workflow fails if any errors are present.
-   Write meaningful commit messages, AKA more than one word long.

### Testing code

Scradd has a couple dev commands to streamline your coding.

-   `npm run build`: One time build
-   `npm run start`: Run the bot
-   `npm run dev`: Build and watch
-   `npm run serve`: Run the bot and restart on each successful build
-   `npm run format`: Format code (please run this before pushing)

In my opinion, it’s easiest to do `npm run serve & npm run dev`, in which case you hardly ever need to touch the terminal. But you are free to pick any combination of commands to build and run your code.
