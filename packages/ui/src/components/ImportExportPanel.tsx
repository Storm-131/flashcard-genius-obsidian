import { useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes, type ReactNode } from 'react'

type FolderImportFile = File & { relativePath?: string }

export interface ImportExportPanelProps {
  busy: boolean
  message: string | null
  onImport: (files: File[], folderName?: string) => void
  onExport: () => void
}

interface FileSystemEntryLike {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void
  createReader?: () => { readEntries: (callback: (entries: FileSystemEntryLike[]) => void, errorCallback?: (error: DOMException) => void) => void }
}

function addRelativePath(file: File, relativePath: string): FolderImportFile {
  try {
    Object.defineProperty(file, 'relativePath', { configurable: true, value: relativePath })
    return file
  } catch {
    const copy = new File([file], file.name, { type: file.type, lastModified: file.lastModified })
    Object.defineProperty(copy, 'relativePath', { configurable: true, value: relativePath })
    return copy
  }
}

async function filesFromEntry(entry: FileSystemEntryLike, parentPath = ''): Promise<FolderImportFile[]> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name
  const getFile = entry.file
  if (entry.isFile && getFile) {
    return new Promise((resolve, reject) => getFile(file => resolve([addRelativePath(file, relativePath)]), reject))
  }
  if (!entry.isDirectory || !entry.createReader) return []
  const reader = entry.createReader()
  const entries: FileSystemEntryLike[] = []
  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (batch.length === 0) break
    entries.push(...batch)
  }
  return (await Promise.all(entries.map(child => filesFromEntry(child, relativePath)))).flat()
}

async function filesFromDrop(event: DragEvent<HTMLDivElement>): Promise<{ files: File[]; folderName?: string }> {
  const entries = [...event.dataTransfer.items]
    .map(item => (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }).webkitGetAsEntry?.() ?? null as FileSystemEntryLike | null)
    .filter((entry): entry is FileSystemEntryLike => Boolean(entry))
  if (entries.length > 0) {
    return {
      files: (await Promise.all(entries.map(entry => filesFromEntry(entry)))).flat(),
      folderName: entries.length === 1 && entries[0].isDirectory ? entries[0].name : undefined,
    }
  }
  const files = [...event.dataTransfer.files]
  const folderName = files[0]?.webkitRelativePath.split('/')[0]
  return { files, folderName: folderName || undefined }
}

function ActionButton({ children, onClick, disabled = false }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className="import-export-action"
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: '30px',
        padding: '6px 8px',
        borderRadius: '5px',
        border: '1px solid #D8D4C8',
        background: '#F7F6F2',
        color: disabled ? '#B8B4A8' : '#4A4640',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '11px',
        lineHeight: 1.25,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

export default function ImportExportPanel(props: ImportExportPanelProps) {
  const [dropActive, setDropActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    if (files.length > 0) props.onImport(files)
    event.target.value = ''
  }

  const handleFolderFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])] as FolderImportFile[]
    if (files.length > 0) {
      const folderName = files[0].webkitRelativePath.split('/')[0] || undefined
      props.onImport(files, folderName)
    }
    event.target.value = ''
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDropActive(false)
    if (props.busy) return
    const { files, folderName } = await filesFromDrop(event)
    if (files.length > 0) props.onImport(files, folderName)
  }

  return (
    <section className="import-export-panel" style={{ margin: '0 10px 8px', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        <ActionButton onClick={() => fileInputRef.current?.click()} disabled={props.busy}>
          Import
        </ActionButton>
        <ActionButton onClick={props.onExport} disabled={props.busy}>
          Export
        </ActionButton>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !props.busy && folderInputRef.current?.click()}
        onKeyDown={event => {
          if (!props.busy && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            folderInputRef.current?.click()
          }
        }}
        onDragOver={event => { event.preventDefault(); if (!props.busy) setDropActive(true) }}
        onDragLeave={() => setDropActive(false)}
        onDrop={event => { void handleDrop(event) }}
        aria-label="Choose a folder or drop files and folders"
        style={{ marginTop: '7px', padding: '8px', borderRadius: '5px', border: `1px dashed ${dropActive ? 'var(--app-accent, #4F46E5)' : '#B8B4A8'}`, background: dropActive ? 'var(--app-accent-soft, #EEF2FF)' : '#F0EDE6', color: '#6B6560', fontSize: '10px', lineHeight: 1.35, textAlign: 'center', cursor: props.busy ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
      >
        Drop Markdown files, image folders, or nested folders here. Click to choose a folder.
      </div>

      <input ref={fileInputRef} type="file" accept=".md,text/markdown,text/plain,image/*" multiple onChange={handleFiles} style={{ display: 'none' }} aria-label="Choose files" />
      <input ref={folderInputRef} type="file" multiple onChange={handleFolderFiles} style={{ display: 'none' }} aria-label="Choose folder" {...({ webkitdirectory: '', directory: '' } as InputHTMLAttributes<HTMLInputElement>)} />
      {props.message && <p role="status" style={{ margin: '7px 2px 0', color: '#6B6560', fontSize: '10px', lineHeight: 1.35 }}>{props.message}</p>}
    </section>
  )
}
