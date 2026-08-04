import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageAssetsProvider } from '../images/ImageAssetsContext'
import { InMemoryImageStorage } from '../images/imageStorage'
import MarkdownContent from './MarkdownContent'
import type { MarkdownRenderContext } from '../markdownRenderer'

function renderWithStorage(content: string, storage = new InMemoryImageStorage()) {
  const result = render(
    <ImageAssetsProvider storage={storage}>
      <MarkdownContent content={content} />
    </ImageAssetsProvider>,
  )
  return { ...result, storage }
}

describe('MarkdownContent images', () => {
  it('passes inline and display math to Obsidian MarkdownRenderer with the source context', async () => {
    const app = {} as MarkdownRenderContext['app']
    const component = {} as MarkdownRenderContext['component']
    const renderMarkdown = vi.fn(async (_app, markdown, element) => {
      element.textContent = markdown
    })
    const markdownContext: MarkdownRenderContext = { app, component, render: renderMarkdown }
    const content = 'Inline $x^2 + y^2 = z^2$ and display $$\\frac{a}{b}$$.'
    const { container } = render(
      <MarkdownContent content={content} markdownContext={markdownContext} sourcePath="Decks/Algebra.md" />,
    )

    await waitFor(() => expect(container).toHaveTextContent(content))
    expect(renderMarkdown).toHaveBeenCalledWith(app, content, expect.any(HTMLDivElement), 'Decks/Algebra.md', component)
  })

  it('does not pass remote Markdown images to Obsidian rendering', async () => {
    const renderMarkdown = vi.fn(async (_app, markdown, element) => { element.textContent = markdown })
    const markdownContext: MarkdownRenderContext = {
      app: {} as MarkdownRenderContext['app'],
      component: {} as MarkdownRenderContext['component'],
      render: renderMarkdown,
    }
    render(
      <MarkdownContent content="![Remote](https://example.com/card.png) ![Local](img/card.png)" markdownContext={markdownContext} />,
    )

    await waitFor(() => expect(renderMarkdown).toHaveBeenCalled())
    expect(renderMarkdown.mock.calls[0]?.[1]).toBe('Remote ![Local](img/card.png)')
  })

  it('adds the zoom control to images rendered by Obsidian', async () => {
    const markdownContext: MarkdownRenderContext = {
      app: {} as MarkdownRenderContext['app'],
      component: {} as MarkdownRenderContext['component'],
      render: vi.fn(async (_app, _markdown, element) => {
        element.innerHTML = '<p><img src="app://local/card.png" alt="Rendered card"></p>'
      }),
    }
    render(<MarkdownContent content="![Rendered card](img/card.png)" markdownContext={markdownContext} />)

    const zoomButton = await screen.findByRole('button', { name: 'Enlarge image: Rendered card' })
    fireEvent.click(zoomButton)
    expect(screen.getByRole('dialog', { name: 'Enlarged view: Rendered card' })).toBeInTheDocument()
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
