import * as core from '@actions/core'
import simpleGit from 'simple-git'

function notEmpty(p: string | undefined) {
  return p && p.trim().length > 0
}

function assertNotEmpty(p: string | undefined, message: string) {
  if (!notEmpty(p)) {
    core.setFailed(message)
    throw new Error(message)
  }
}

export async function run(): Promise<void> {
  const commitMessage: string = core.getInput('commitMessage')
  let tagMessage: string = core.getInput('tagMessage')
  const tagVersion: string = core.getInput('tagVersion')
  let branchName: string = core.getInput('branchName')
  let remote: string = core.getInput('remote')

  core.debug(`commitMessage: ${commitMessage}`)
  core.debug(`tagMessage: ${tagMessage}`)
  core.debug(`tagVersion: ${tagVersion}`)
  core.debug(`branchName: ${branchName}`)
  core.debug(`remote: ${remote}`)

  tagMessage = notEmpty(tagMessage) ? tagMessage : `Version ${tagVersion}`
  remote = notEmpty(remote) ? remote : 'origin'
  branchName = notEmpty(branchName) ? branchName : `build-${tagVersion}`

  assertNotEmpty(commitMessage, '\'commitMessage\' cannot be empty')
  assertNotEmpty(tagVersion, '\'tagVersion\' cannot be empty')

  try {
    const git = simpleGit()

    await git.pull(remote)

    await git.checkoutLocalBranch(branchName)

    await git.add('.')
    await git.commit(commitMessage)

    await git.raw('tag', '-fa', tagVersion, '-m', tagMessage)
    await git.raw('push', remote, '-f', `refs/tags/${tagVersion}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
