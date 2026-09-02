# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

A GitHub Action (`KMMBridge: Local SPM Publishing Support`) that force-updates a
git tag so a Kotlin Multiplatform SPM `Package.swift` can point at a GitHub
Release binary whose URL isn't known until after the release exists. It commits
the working tree, force-creates an annotated tag on that commit, and pushes
**only the tag ref** — the commit is deliberately left dangling, not merged into
any branch. See the README for the KMMBridge context.

The whole action is ~50 lines in `src/main.ts`; the scaffolding around it came
from the
[`actions/typescript-action`](https://github.com/actions/typescript-action)
template.

## Build / test commands

```bash
npm install            # node_modules is not checked in
npm run package        # ncc bundle src/index.ts -> dist/  (REQUIRED after any src change)
npm run bundle         # format:write + package
npm run all            # format + lint + test + coverage badge + package
npm run format:check   # what CI runs
npm run lint           # eslint (flat config, auto-discovered)
npx jest __tests__/main.test.ts          # single test file
npx jest -t 'defaults tagMessage'        # single test by name
```

Node is pinned in `.node-version` (24.20.0, the active LTS); CI reads it via
`node-version-file`.

## dist/ is the shipped artifact

`action.yml` runs `dist/index.js`, not `src/`. The bundle is committed to the
repo, and `.github/workflows/check-dist.yml` fails the build if `npm run bundle`
produces a diff. **Every change to `src/` must be followed by `npm run package`
and the regenerated `dist/` files committed in the same commit.** `dist/**` is
marked `-diff linguist-generated=true` in `.gitattributes`, so those diffs are
suppressed in review — that's expected, don't fight it.

## Version ceilings — do not "upgrade" past these

Several dependencies cannot go to their newest major. Verified constraints, not
caution:

- **`@actions/core` must stay on the 2.x line.** 3.0.0 is ESM-only (its
  `exports` has only an `import` condition). ncc/webpack silently bundles it as
  a `webpackMissingModule` stub and the action throws
  `Cannot find module '@actions/core'` _at runtime_; Jest's CJS resolver can't
  resolve it either. 2.x already has the Node 24 support added in 2.0.0. If you
  bump this, run the built `dist/index.js`, not just the tests.
- **`typescript` caps at 6.0.x.** `@typescript-eslint@8` peers
  `typescript >=4.8.4 <6.1.0` and `ts-jest@29` peers `typescript >=4.3 <7`.
  TypeScript 7 breaks both.
- **`baseUrl` is gone from `tsconfig.json`** — TS 6 errors on it (TS5101). Don't
  reintroduce it.

## Code layout

- `action.yml` — input contract (`commitMessage`, `tagVersion` required;
  `tagMessage`, `branchName`, `remote` optional) and `using: node24`. Adding an
  input here means adding a matching `core.getInput` in `main.ts`; the two files
  must be kept in sync by hand.
- `src/index.ts` — entrypoint, just calls `run()`.
- `src/main.ts` — all logic. Reads inputs, validates the required ones, applies
  defaults (`tagMessage` → `Version ${tagVersion}`, `remote` → `origin`,
  `branchName` → `build-${tagVersion}`), then a `simple-git` sequence: `pull` →
  `checkoutLocalBranch` → `add .` → `commit` → `tag -fa` →
  `push <remote> -f refs/tags/<tag>`.
- `eslint.config.mjs` — flat config at the repo root. ESLint 10 removed eslintrc
  support entirely, so the old `.github/linters/.eslintrc.yml` and
  `.eslintignore` are gone; ignores live in the config's `ignores` array.
  `tsconfig.eslint.json` is the type-aware-linting project (it covers
  `__tests__/`, which the build `tsconfig.json` excludes).

Everything in `run()` is inside one try/catch, and failures are reported with
`core.setFailed`. Input validation throws from inside that try, so a missing
required input fails the action cleanly with an `::error::` annotation rather
than an unhandled rejection.

The action calls `git pull <remote>` against the _current_ branch, so it
requires the checkout to be on a branch with tracking info — it fails on a
detached HEAD.

## Testing

`__tests__/main.test.ts` mocks `simple-git` and asserts the exact git command
sequence, so nothing touches a real repository. Note two Jest-30-specific
idioms:

- `jest.fn<(x: T) => Promise<void>>()` — untyped `jest.fn()` infers a zero-arg
  signature and `toHaveBeenCalledWith(...)` then fails to type-check.
- Use `mockResolvedValue`/`mockRejectedValueOnce`, not
  `async () => { throw ... }`; the latter trips `require-await` and
  `promise-function-async` against each other.

`__tests__/index.test.ts` uses `jest.requireActual` rather than bare `require`
(untyped in an ESM source file) or dynamic `import()` (needs
`--experimental-vm-modules` under CJS Jest).

ci.yml's `test-action` job runs the real built action against a **throwaway bare
repo** in `$RUNNER_TEMP` — never `origin`. If you touch that job, keep it that
way: pointing it at `origin` would force-push tags to this repository on every
PR.

## Linting split

`npm run lint` / `npm run format:check` (ci.yml) own TypeScript and formatting.
super-linter (linter.yml) has ESLint and Prettier explicitly disabled, because
it ships its own copies that can't resolve this repo's plugins and would
disagree on formatting; it covers Markdown, YAML, Bash, workflow syntax and
secret scanning instead.

## Releasing

`script/release` (interactive) tags `vX.X.X` and pushes. Consumers reference
this action by tag, so a release is only usable if the committed `dist/` matches
`src/` at that tag.

## Known stale

`CODEOWNERS` still points at `@actions/actions-oss-maintainers`, a team from the
upstream template that doesn't exist for this repo. Left alone deliberately —
repo ownership is the maintainer's call.
