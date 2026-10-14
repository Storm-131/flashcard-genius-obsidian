export class Modal {
  readonly contentEl = document.createElement('div')

  constructor(readonly app: unknown) {}

  setTitle(title: string): this {
    this.contentEl.setAttribute('aria-label', title)
    return this
  }

  open(): void {
    this.onOpen()
  }

  close(): void {
    this.onClose()
  }

  onOpen(): void {}

  onClose(): void {}
}

class TextComponent {
  readonly inputEl = document.createElement('input')

  setValue(value: string): this {
    this.inputEl.value = value
    return this
  }

  onChange(callback: (value: string) => void): this {
    this.inputEl.addEventListener('input', () => callback(this.inputEl.value))
    return this
  }
}

class ButtonComponent {
  setButtonText(): this { return this }
  setCta(): this { return this }
  onClick(): this { return this }
}

export class Setting {
  constructor(readonly containerEl: HTMLElement) {}
  setName(): this { return this }
  addText(callback: (text: TextComponent) => void): this {
    callback(new TextComponent())
    return this
  }
  addButton(callback: (button: ButtonComponent) => void): this {
    callback(new ButtonComponent())
    return this
  }
}

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
