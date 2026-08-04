import { describe, expect, it } from 'vitest'
import { InMemoryImageStorage } from './imageStorage'

describe('InMemoryImageStorage', () => {
  it('erzeugt kollisionsfreie Workspace-Pfade', () => {
    const storage = new InMemoryImageStorage()
    const first = storage.store(new Blob(['first'], { type: 'image/png' }), 'Lern bild.png')
    const second = storage.store(new Blob(['second'], { type: 'image/png' }), 'Lern bild.png')

    expect(first.path).toBe('img/Lern-bild.png')
    expect(second.path).toBe('img/Lern-bild-2.png')
    expect(storage.get(first.path)?.blob).toBe(first.blob)
  })
})
