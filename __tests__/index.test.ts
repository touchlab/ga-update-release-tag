/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import { jest, describe, it, expect } from '@jest/globals'
import * as main from '../src/main'

describe('index', () => {
  it('calls run when imported', () => {
    const runMock = jest.spyOn(main, 'run').mockResolvedValue(undefined)

    // Loaded for its side effect: src/index.ts calls run() at import time.
    jest.requireActual('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
