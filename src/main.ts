import * as core from '@actions/core'
import simpleGit from 'simple-git'

export async function run(): Promise<void> {
  try {
    const commitMessage: string = core.getInput('commitMessage')
    const tagMessage: string = core.getInput('tagMessage')
    const tagVersion: string = core.getInput('tagVersion')
    const branchName: string = core.getInput('branchName')

    core.debug(`commitMessage: ${commitMessage}`)
    core.debug(`tagMessage: ${tagMessage}`)
    core.debug(`tagVersion: ${tagVersion}`)
    core.debug(`branchName: ${branchName}`)

    const git = simpleGit()

    await git.pull()

    await git.checkoutLocalBranch(branchName)

    const diff = await git.diffSummary()

    if (diff.changed > 0) {
      core.info("Code changed. Add and commit.")
      for(const diffFile of diff.files){
        core.debug(`-- ${diffFile.file}`)
      }
      await git.add('.')
      await git.commit(commitMessage)
    } else {
      core.error("No diff found. Nothing to update.")
      core.setFailed("No diff found. Nothing to update.")
    }

    await git.raw('tag', '-fa', tagVersion, '-m', tagMessage)
    await git.raw('push', 'origin', '-f', `refs/tags/${tagVersion}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
