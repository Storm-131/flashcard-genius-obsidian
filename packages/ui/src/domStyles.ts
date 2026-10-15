// Prefer the host API for dynamic CSS variables. The standalone browser preview
// has no Obsidian DOM extensions, so it needs the equivalent standard DOM path.
export function setCssProps(element: HTMLElement, props: Record<string, string>): void {
  if (typeof element.setCssProps === 'function') {
    element.setCssProps(props)
    return
  }
  for (const [property, value] of Object.entries(props)) {
    element.style.setProperty(property, value)
  }
}
