import { Modal, Setting, type App } from 'obsidian'

class LinkUrlModal extends Modal {
  private inputValue: string
  private settled = false

  constructor(app: App, initialValue: string, private readonly resolveResult: (value: string | null) => void) {
    super(app)
    this.inputValue = initialValue
  }

  onOpen(): void {
    this.setTitle('Link URL')
    this.contentEl.addClass('flashcard-genius-settings')

    new Setting(this.contentEl)
      .setName('URL')
      .addText(text => {
        text.setValue(this.inputValue)
        text.onChange(value => { this.inputValue = value })
        text.inputEl.addEventListener('keydown', event => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          this.confirm()
        })
        window.requestAnimationFrame(() => {
          text.inputEl.focus()
          text.inputEl.select()
        })
      })

    new Setting(this.contentEl)
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()))
      .addButton(button => button
        .setButtonText('OK')
        .setCta()
        .onClick(() => this.confirm()))
  }

  onClose(): void {
    this.contentEl.empty()
    if (!this.settled) this.resolveResult(null)
  }

  private confirm(): void {
    if (this.settled) return
    this.settled = true
    const value = this.inputValue
    this.close()
    this.resolveResult(value)
  }
}

export function requestLinkUrl(app: App, initialValue = ''): Promise<string | null> {
  return new Promise(resolve => new LinkUrlModal(app, initialValue, resolve).open())
}
