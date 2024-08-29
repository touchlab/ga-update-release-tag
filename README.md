# Kotlin Multiplatform SPM publishing from a local repo

## Main Docs

This plugin helps support [KMMBridge](https://touchlab.co/kmmbridge/) features. To understand how to use it, please follow those docs and tutorials.

## Overview

When publishing SPM binaries for KMP, you need a `Package.swift` file pointing at your binary, and that needs to be referenced by a git tag.

When using GitHub Releases to store your binary zip, there's an issue. You need a release to push to, and you need the "real" URL of the artifact, which you cannot determine before pushing the file.

So, to use GitHub Releases, you'll need to force-update the git tag associated with the GitHub Release. This action will do that for you.

Also, this action assumes you want to support a local-dev workflow for testing the KMP code. As such, the tagged commit created for the SPM release is not pushed to any specific branch. The commit referenced by the tag exists, but is not part of any branch in the repo.

## Arguments

* `commitMessage` - Required - Message for the commit which updates the `Package.swift` file
* `tagMessage` - Optional - Message for the version tag commit. Defaults to "Version ${tagVersion}"
* `tagVersion` - Required - Version string to use in the tag. Should follow [semver rules](https://semver.org/).
* `branchName` - Optional - Branch to create and build with. Safe to ignore this.
* `remote` - Optional - Remote to push to. Default to "origin".