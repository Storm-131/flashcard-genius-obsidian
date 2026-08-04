export interface MarkdownImageReference {
  alt: string
  path: string
  raw: string
  start: number
  end: number
}

const markdownImagePattern = /!\[([^\]]*)\]\(([^)\n]+)\)/g

export function extractMarkdownImages(markdown: string): MarkdownImageReference[] {
  markdownImagePattern.lastIndex = 0
  return [...markdown.matchAll(markdownImagePattern)].map(match => ({
    alt: match[1].trim(),
    path: match[2].trim(),
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
  return markdown.replace(markdownImagePattern, (raw, alt: string, path: string) => {
    const trimmedPath = path.trim()
    const replacement = paths.get(trimmedPath) ?? paths.get(trimmedPath.replace(/^\.\//, ''))
    return replacement ? `![${alt}](${replacement})` : raw
  })
}
