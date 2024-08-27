import * as core from '@actions/core'
import simpleGit from 'simple-git'

export async function run(): Promise<void> {
  try {
    const commitMessage: string = core.getInput('commitMessage')
    const tagMessage: string = core.getInput('tagMessage')
    const tagVersion: string = core.getInput('tagVersion')
    let branchName: string = core.getInput('branchName')
    const repoPath: string = core.getInput('repoPath')
    let remote: string = core.getInput('remote')

    core.debug(`commitMessage: ${commitMessage}`)
    core.debug(`tagMessage: ${tagMessage}`)
    core.debug(`tagVersion: ${tagVersion}`)
    core.debug(`branchName: ${branchName}`)
    core.debug(`repoPath: ${repoPath}`)
    core.debug(`remote: ${remote}`)

    branchName = branchName ? branchName : `build-${tagVersion}`
    remote = remote ? remote : "origin"

    const git = repoPath ? simpleGit(repoPath) : simpleGit()

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
