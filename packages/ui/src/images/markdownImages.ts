export interface MarkdownImageReference {
  alt: string
  path: string
  raw: string
  start: number
  end: number
}

const markdownImagePattern = /!\[([^\]]*)\]\(([^)\n]+)\)|!\[\[([^\]\n]+)\]\]/g

function imageParts(alt: string | undefined, path: string | undefined, wiki: string | undefined) {
  if (wiki !== undefined) {
    const [wikiPath] = wiki.replace(/\\\|/g, '|').split('|')
    return { alt: wikiPath.trim().split('/').pop() ?? '', path: wikiPath.trim() }
  }
  return { alt: (alt ?? '').trim(), path: (path ?? '').trim() }
}

export function extractMarkdownImages(markdown: string): MarkdownImageReference[] {
  markdownImagePattern.lastIndex = 0
  return [...markdown.matchAll(markdownImagePattern)].map(match => ({
    ...imageParts(match[1], match[2], match[3]),
    raw: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

export function hasMarkdownImages(markdown: string): boolean {
  markdownImagePattern.lastIndex = 0
  const result = markdownImagePattern.test(markdown)
  markdownImagePattern.lastIndex = 0
  return result
}

export function stripMarkdownImages(markdown: string): string {
  markdownImagePattern.lastIndex = 0
  return markdown
    .replace(markdownImagePattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function removeMarkdownImage(markdown: string, image: MarkdownImageReference): string {
  const withoutImage = `${markdown.slice(0, image.start)}${markdown.slice(image.end)}`
  return withoutImage
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function rewriteMarkdownImagePaths(markdown: string, paths: ReadonlyMap<string, string>): string {
  markdownImagePattern.lastIndex = 0
  return markdown.replace(markdownImagePattern, (raw, alt: string | undefined, path: string | undefined, wiki: string | undefined) => {
    const image = imageParts(alt, path, wiki)
    const replacement = paths.get(image.path) ?? paths.get(image.path.replace(/^\.\//, ''))
    if (!replacement) return raw
    // Preserve Obsidian sizing/alias syntax while resolving the vault path.
    return wiki !== undefined
      ? raw.replace(wiki.split(/\\?\|/)[0], replacement)
      : `![${alt}](${replacement})`
  })
}
