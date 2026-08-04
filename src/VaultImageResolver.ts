import type { ImageResolver, ResolvedImage } from '@flashcard-genius/ui'

const noRelease = () => undefined

export class VaultImageResolver implements ImageResolver {
  resolve(path: string): ResolvedImage {
    const normalizedPath = path.trim()
    if (/^(data:|blob:|app:|capacitor:)/i.test(normalizedPath)) {
      return { src: normalizedPath, missing: false, release: noRelease }
    }

    return { src: null, missing: true, release: noRelease }
  }
}
