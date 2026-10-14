import { ImportExportError } from './errors'
import type { WorkspaceSnapshot } from './types'

interface WritableFileLike {
  write(data: string | Blob): Promise<void>
  close(): Promise<void>
}

interface FileHandleLike {
  kind: 'file'
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<WritableFileLike>
}

interface DirectoryHandleLike {
  kind: 'directory'
  name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>
  removeEntry(name: string): Promise<void>
  values(): AsyncIterable<FileHandleLike | DirectoryHandleLike>
}

export interface StorageProvider {
  readonly name: string
  load(): Promise<WorkspaceSnapshot>
  saveMarkdown(fileName: string, content: string): Promise<void>
  saveImage(path: string, blob: Blob): Promise<void>
  deleteMarkdown(fileName: string): Promise<void>
}

export class FileSystemWorkspaceStorageProvider implements StorageProvider {
  constructor(private readonly root: DirectoryHandleLike) {}

  get name(): string {
    return this.root.name
  }

  async load(): Promise<WorkspaceSnapshot> {
    const markdownFiles: WorkspaceSnapshot['markdownFiles'] = []
    const images: WorkspaceSnapshot['images'] = []

    for await (const handle of this.root.values()) {
      if (handle.kind === 'file' && handle.name.toLowerCase().endsWith('.md')) {
        const file = await handle.getFile()
        markdownFiles.push({ name: handle.name, content: await file.text() })
      }
    }

    try {
      const imageDirectory = await this.root.getDirectoryHandle('img')
      for await (const handle of imageDirectory.values()) {
        if (handle.kind !== 'file') continue
        images.push({ path: `img/${handle.name}`, blob: await handle.getFile() })
      }
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error
    }

    return { markdownFiles, images }
  }

  async saveMarkdown(fileName: string, content: string): Promise<void> {
    const handle = await this.root.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async saveImage(path: string, blob: Blob): Promise<void> {
    const fileName = path.replace(/^\.?\/?img\//, '').split('/').pop()
    if (!fileName) throw new ImportExportError(`Invalid image path: ${path}`)
    const imageDirectory = await this.root.getDirectoryHandle('img', { create: true })
    const handle = await imageDirectory.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
  }

  async deleteMarkdown(fileName: string): Promise<void> {
    try {
      await this.root.removeEntry(fileName)
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error
    }
  }
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function selectFileSystemWorkspace(): Promise<StorageProvider> {
  const picker = (window as Window & {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>
  }).showDirectoryPicker
  if (!picker) {
    throw new ImportExportError('This browser does not support the File System Access API. Use file or ZIP import instead.')
  }
  const directory = await picker.call(window, { mode: 'readwrite' })
  return new FileSystemWorkspaceStorageProvider(directory)
}
