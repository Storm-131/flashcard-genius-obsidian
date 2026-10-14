// Obsidian ships type declarations; the host supplies its runtime API.
export class TAbstractFile {
  path = ''
  name = ''
  parent: TFolder | null = null
}

export class TFile extends TAbstractFile {
  name = 'birds.md'
  basename = 'birds'
  extension = 'md'
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = []
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
}
