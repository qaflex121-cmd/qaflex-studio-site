# QAFlex Studio Development Workflow

This repository uses three branches to protect the live website.

## Branches

- `main` — production source for the live GitHub Pages website. Do not make routine edits directly here.
- `develop` — make and integrate day-to-day website changes here first.
- `staging` — release-candidate branch. Merge tested changes from `develop` into this branch before opening a pull request to `main`.

## Safe release process

1. Start from the latest `develop` branch.
2. Make a focused change and commit it to `develop`.
3. Test locally before sharing: open `index.html`, check desktop and mobile layouts, navigation anchors, Gumroad links, and all PDF downloads.
4. Merge `develop` into `staging` and perform a final review.
5. Open a pull request from `staging` to `main`. Review the diff and confirm no unrelated files changed.
6. Merge only after checks pass. GitHub Pages will continue publishing from the existing production configuration.
7. If a release breaks the site, revert the production merge commit or restore the last known-good version.

## Important GitHub Pages note

Creating branches does not create separate public website URLs. Keep GitHub Pages on its current production source. Do not change the Pages publishing source to `develop` or `staging`, because that could replace the live site. A separate staging URL requires a separate staging repository or a deliberately configured preview deployment.

## Pre-release checklist

- [ ] Homepage and navigation render on desktop and mobile.
- [ ] All product links open the correct Gumroad pages.
- [ ] All three PDF links open/download correctly.
- [ ] Newsletter signup form loads and test signup works.
- [ ] No credentials, API keys, or private data are committed.
- [ ] Pull request diff reviewed before merging to `main`.
