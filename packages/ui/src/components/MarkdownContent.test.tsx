import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImageAssetsProvider } from '../images/ImageAssetsContext'
import { InMemoryImageStorage } from '../images/imageStorage'
import MarkdownContent from './MarkdownContent'
import { FallbackMathContext } from '../markdownRenderer'
import { renderPreviewMath } from '../../../../web/src/mathRenderer'

function renderWithStorage(content: string, storage = new InMemoryImageStorage()) {
  const result = render(
    <ImageAssetsProvider storage={storage}>
      <FallbackMathContext.Provider value={renderPreviewMath}><MarkdownContent content={content} /></FallbackMathContext.Provider>
    </ImageAssetsProvider>,
  )
  return { ...result, storage }
}

describe('MarkdownContent images', () => {
  it.each(['100', '250', '300x200'])('renders Obsidian images without imposing the source size %s', async size => {
    const storage = new InMemoryImageStorage()
    const asset = storage.store(new Blob(['image'], { type: 'image/webp' }), 'Sperber.webp')
    renderWithStorage(`![[${asset.path}|${size}]]`, storage)
    const image = await screen.findByRole('img', { name: 'Sperber.webp' })
    expect(image).toHaveAttribute('src', expect.stringMatching(/^blob:test-/))
    expect(image).not.toHaveAttribute('width')
    expect(image).not.toHaveAttribute('height')
    expect(image).not.toHaveStyle({ width: `${size}px` })
  })

  it('shows one paragraph gap between merged answers and preserves inline breaks', () => {
    const { container } = renderWithStorage('**First**\nDetail\n\n\n- Second\n- Third\n\n![Bird](img/bird.webp)')
    expect(screen.getByText('First').tagName).toBe('STRONG')
    expect(screen.getByText('Detail')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(container.querySelectorAll('.markdown-paragraph-gap')).toHaveLength(2)
  })

  it('renders inline LaTeX in text and nested formatting', () => {
    const { container } = renderWithStorage('The formula is $x^2 + y^2 = z^2$ and **\\(\\frac{a}{b}\\)**.')

    const formulas = container.querySelectorAll('.katex')
    expect(formulas).toHaveLength(2)
    expect(formulas[0].innerHTML).toContain('x^2 + y^2 = z^2')
    expect(formulas[1].innerHTML).toContain('\\frac{a}{b}')
  })

  it('rendert Markdown-Bilder aus dem internen Blob-Speicher und gibt die Object URL frei', async () => {
    const storage = new InMemoryImageStorage()
    const asset = storage.store(new Blob(['image'], { type: 'image/png' }), 'diagram.png')
    const { unmount } = renderWithStorage(`![Gradienten-Diagramm](${asset.path})`, storage)

    const image = await screen.findByRole('img', { name: 'Gradienten-Diagramm' })
    expect(image).toHaveAttribute('src', expect.stringMatching(/^blob:test-/))

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('zeigt für ein fehlendes Bild einen verständlichen Platzhalter', async () => {
    renderWithStorage('![Neuronales Netz](img/fehlt.png)')

    expect(await screen.findByRole('img', { name: 'Missing image: Neuronales Netz' })).toHaveTextContent(
      'Image "Neuronales Netz" is unavailable.',
    )
  })

  it('öffnet das Overlay über die Lupe und schließt es per Außenklick und Escape', async () => {
    const storage = new InMemoryImageStorage()
    const asset = storage.store(new Blob(['image'], { type: 'image/png' }), 'karte.png')
    const { container } = renderWithStorage(`![Lernkarte](${asset.path})`, storage)
    await screen.findByRole('img', { name: 'Lernkarte' })
    const zoomButton = () => screen.getByRole('button', { name: 'Enlarge image: Lernkarte' })

    fireEvent.click(zoomButton())
    let dialog = screen.getByRole('dialog', { name: 'Enlarged view: Lernkarte' })
    fireEvent.click(within(dialog).getByRole('img', { name: 'Lernkarte' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(zoomButton())
    dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(zoomButton())
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(container.querySelector('.markdown-image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enlarge image: Lernkarte' })).toBeInTheDocument()
  })

  it('rendert Bildsyntax in Fragen nicht als Bild', () => {
    render(
      <ImageAssetsProvider>
        <MarkdownContent content="![Nicht erlaubt](img/question.png)" allowImages={false} />
      </ImageAssetsProvider>,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('![Nicht erlaubt](img/question.png)')).toBeInTheDocument()
  })
})
