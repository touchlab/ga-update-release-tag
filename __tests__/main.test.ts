/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * `simple-git` is mocked so the tests assert the exact git command sequence the
 * action issues, without touching a real repository.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import * as core from '@actions/core'
import * as main from '../src/main'

// Only the surface src/main.ts actually uses, typed so argument assertions
// type-check under Jest 30's stricter jest.fn() inference.
const mockGit = {
  pull: jest.fn<(remote?: string) => Promise<void>>(),
  checkoutLocalBranch: jest.fn<(name: string) => Promise<void>>(),
  add: jest.fn<(files: string) => Promise<void>>(),
  commit: jest.fn<(message: string) => Promise<void>>(),
  raw: jest.fn<(...args: string[]) => Promise<void>>()
}

jest.mock('simple-git', () => ({ simpleGit: () => mockGit }))

let debugMock: jest.SpiedFunction<typeof core.debug>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>

/** Build a core.getInput implementation from a plain object of inputs. */
function inputs(values: Record<string, string>): void {
  getInputMock.mockImplementation((name: string) => values[name] ?? '')
}

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation(() => undefined)
    getInputMock = jest.spyOn(core, 'getInput')
    setFailedMock = jest
      .spyOn(core, 'setFailed')
      .mockImplementation(() => undefined)
  })

  it('commits, tags and force-pushes only the tag ref', async () => {
    inputs({
      commitMessage: 'Update Package.swift',
      tagVersion: '1.2.3',
      tagMessage: 'Release 1.2.3',
      branchName: 'my-branch',
      remote: 'upstream'
    })

    await main.run()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(mockGit.pull).toHaveBeenCalledWith('upstream')
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('my-branch')
    expect(mockGit.add).toHaveBeenCalledWith('.')
    expect(mockGit.commit).toHaveBeenCalledWith('Update Package.swift')
    expect(mockGit.raw).toHaveBeenNthCalledWith(
      1,
      'tag',
      '-fa',
      '1.2.3',
      '-m',
      'Release 1.2.3'
    )
    // Only the tag ref is pushed - the commit stays off every branch.
    expect(mockGit.raw).toHaveBeenNthCalledWith(
      2,
      'push',
      'upstream',
      '-f',
      'refs/tags/1.2.3'
    )
  })

  it('defaults tagMessage, remote and branchName', async () => {
    inputs({ commitMessage: 'Bump', tagVersion: '4.5.6' })

    await main.run()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(mockGit.pull).toHaveBeenCalledWith('origin')
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('build-4.5.6')
    expect(mockGit.raw).toHaveBeenNthCalledWith(
      1,
      'tag',
      '-fa',
      '4.5.6',
      '-m',
      'Version 4.5.6'
    )
    expect(mockGit.raw).toHaveBeenNthCalledWith(
      2,
      'push',
      'origin',
      '-f',
      'refs/tags/4.5.6'
    )
  })

  it('treats whitespace-only optional inputs as absent', async () => {
    inputs({
      commitMessage: 'Bump',
      tagVersion: '7.0.0',
      tagMessage: '   ',
      remote: '  ',
      branchName: ' '
    })

    await main.run()

    expect(mockGit.pull).toHaveBeenCalledWith('origin')
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('build-7.0.0')
    expect(mockGit.raw).toHaveBeenNthCalledWith(
      1,
      'tag',
      '-fa',
      '7.0.0',
      '-m',
      'Version 7.0.0'
    )
  })

  it.each([
    [
      'commitMessage',
      { tagVersion: '1.2.3' },
      "'commitMessage' cannot be empty"
    ],
    ['tagVersion', { commitMessage: 'Bump' }, "'tagVersion' cannot be empty"]
  ])(
    'fails when %s is missing, before touching git',
    async (_name, given, message) => {
      inputs(given)

      await main.run()

      expect(setFailedMock).toHaveBeenCalledWith(message)
      expect(mockGit.pull).not.toHaveBeenCalled()
      expect(mockGit.commit).not.toHaveBeenCalled()
      expect(mockGit.raw).not.toHaveBeenCalled()
    }
  )

  it('reports a git failure via setFailed rather than throwing', async () => {
    inputs({ commitMessage: 'Bump', tagVersion: '1.2.3' })
    mockGit.commit.mockRejectedValueOnce(new Error('nothing to commit'))

    await expect(main.run()).resolves.toBeUndefined()

    expect(setFailedMock).toHaveBeenCalledWith('nothing to commit')
    // The tag must not be created or pushed when the commit fails.
    expect(mockGit.raw).not.toHaveBeenCalled()
  })

  it('logs the resolved inputs', async () => {
    inputs({ commitMessage: 'Bump', tagVersion: '1.2.3' })

    await main.run()

    expect(debugMock).toHaveBeenCalledWith('commitMessage: Bump')
    expect(debugMock).toHaveBeenCalledWith('tagVersion: 1.2.3')
  })
})
