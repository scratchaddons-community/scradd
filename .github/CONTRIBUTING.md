# Contributing guidelines

For anyone who knows [Git](https://git-scm.com) and TypeScript/JavaScript basics: feel free to contribute to this repository! Our code is open source. Be sure to follow our [code of conduct](CODE_OF_CONDUCT.md). Anyone who has a meaningful pull request merged may also receive one or more of the following:

-   `@Scradd Contributor` role in the Scratch Addons server
-   access to the private Scradd Testing server
-   credit under `/credits`

## General guidelines

Please:

-   Follow [the code of conduct](CODE_OF_CONDUCT.md).
-   Stay on topic. Use the SA server for random chatting, that's basically why it exists.
-   Use reactions instead of meaningless comments, or in other words, 👍 reactions instead of “Good idea” comments.

## Filing [issues](https://docs.github.com/en/github/managing-your-work-on-github/about-issues)

Feel free to report bugs and request features in an issue. Be sure to check if it is already reported by using the search bar [here](https://github.com/scratchaddons-community/scradd/issues). If there are no similar issues, you can create a new one. We will take a look at it.

## Creating [pull requests (PRs)](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests)

Contributions are welcome! However, before coding new features, please discuss it with cobalt, whether that be in an issue here or somewhere on Discord.

### Selecting an issue

The [issues section](https://github.com/scratchaddons-community/scradd/issues?q=is%3Aissue+is%3Aopen) is my TODO list. If I am assigned, that means I would like to do this myself, but if you would strongly prefer to do it, leave a comment and we could figure something out. If it's unassigned, it's something I want that you may take up without asking -- just leave a comment saying you’ll do it. Things with the "status: help wanted" label are things I don't care if they are added or not, and I won't code them. They'll only happen if someone else does it.

Please prioritize issues attached to milestones, especially the sooner versions.

### Contributing code

When you’re ready to contribute, you can create a pull request. Fork this repository and create a new branch from the `main` branch. Set up your testing environment as documented [in the README](/README.md#setup) and make your changes to the new branch. Now, create a pull request on the origin repository (scratchaddons-community/scradd). We will review your pull request. Please make sure to include `Resolves #123` in the pull request description, where `#123` is the appropriate issue number. That will cause GitHub to automatically close the issue when the PR is merged.

Please:

-   Minimize the number of `@ts-` comments you use, and if you must use one, use `@ts-expect-error`.
-   Format your code by using `npm run format` before pushing. If you don’t, it may be automatically run in the workflow.
-   Lint your code by using `npm run lint`. No lint errors may be present when your PR is merged. Warnings may be allowed depending on the context. Some lint errors may be fixed automatically with `npm run lint -- --fix`, but it is important to manually confirm it worked as intended. The workflow fails if any errors are present.
-   Rerun the unit tests by using `npm run test`. Make sure the unit tests continue to succeed. No tests may fail when your PR is merged. We would also very much appreciate any new tests you add if you could. We use the Node.js native test runner for tests.

To test your code, it’s easiest to run `npm run serve & npm run dev` in my opinion. That runs both TypeScript and nodemon on watch mode, to attempt to rebuild your code on every change, and to restart the bot on every successful build. Using this setup, you hardly ever need to touch the terminal, and there's only one place you need to look for error logs.

Before committing your code, it is necessary to run `npm run format`, then `npm run lint` and fix any lint errors, finally `npm run test` and fix any failing tests, then repeat all three until no more lint errors are left.
