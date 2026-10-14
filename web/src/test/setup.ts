import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

cleanup()
afterEach(cleanup)

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => `blob:test-${Math.random()}`),
})

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
})
