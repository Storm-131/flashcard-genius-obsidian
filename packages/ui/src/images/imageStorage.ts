export interface StoredImageAsset {
  path: string
  blob: Blob
  originalName: string
}

export interface ImageStorage {
  store(blob: Blob, fileName: string): StoredImageAsset
  get(path: string): StoredImageAsset | undefined
  delete(path: string): void
  list(): StoredImageAsset[]
  clear(): void
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const lastSegment = normalized.split(/[\\/]/).pop() || 'image'
  const safeName = lastSegment
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return safeName || 'image'
}

function splitFileName(fileName: string): { stem: string; extension: string } {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { stem: fileName, extension: '' }
  }
  return { stem: fileName.slice(0, dotIndex), extension: fileName.slice(dotIndex) }
}

export class InMemoryImageStorage implements ImageStorage {
  private readonly assets = new Map<string, StoredImageAsset>()

  store(blob: Blob, fileName: string): StoredImageAsset {
    const safeName = sanitizeFileName(fileName)
    const { stem, extension } = splitFileName(safeName)
    let path = `img/${safeName}`
    let suffix = 2

    while (this.assets.has(path)) {
      path = `img/${stem}-${suffix}${extension}`
      suffix += 1
    }

    const asset = { path, blob, originalName: fileName }
    this.assets.set(path, asset)
    return asset
  }

  get(path: string): StoredImageAsset | undefined {
    return this.assets.get(path.replace(/^\.\//, ''))
  }

  delete(path: string): void {
    this.assets.delete(path.replace(/^\.\//, ''))
  }

  list(): StoredImageAsset[] {
    return [...this.assets.values()]
  }

  clear(): void {
    this.assets.clear()
  }
}
