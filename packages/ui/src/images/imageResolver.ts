import type { ImageStorage } from './imageStorage'

export interface ResolvedImage {
  src: string | null
  missing: boolean
  release: () => void
}

export interface ImageResolver {
  resolve(path: string): ResolvedImage
}

const noRelease = () => undefined

export class ObjectUrlImageResolver implements ImageResolver {
  constructor(private readonly storage: ImageStorage) {}

  resolve(path: string): ResolvedImage {
    const normalizedPath = path.replace(/^\.\//, '')

    if (/^(data:|blob:)/i.test(normalizedPath)) {
      return { src: normalizedPath, missing: false, release: noRelease }
    }

    const asset = this.storage.get(normalizedPath)
    if (!asset) return { src: null, missing: true, release: noRelease }

    const src = URL.createObjectURL(asset.blob)
    let released = false
    return {
      src,
      missing: false,
      release: () => {
        if (released) return
        URL.revokeObjectURL(src)
        released = true
      },
    }
  }
}
