export class ImportExportError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message)
    this.name = 'ImportExportError'
  }
}

export function formatImportExportError(error: unknown): string {
  if (error instanceof ImportExportError) {
    return error.details.length > 0 ? `${error.message} ${error.details.join(' ')}` : error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') return 'Vorgang abgebrochen.'
  if (error instanceof Error) return error.message
  return 'Der Vorgang konnte nicht abgeschlossen werden.'
}
