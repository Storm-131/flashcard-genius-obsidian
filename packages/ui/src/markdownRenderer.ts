import type { App, Component } from 'obsidian'

export type MarkdownRenderFunction = (
  app: App,
  markdown: string,
  element: HTMLElement,
  sourcePath: string,
  component: Component,
) => Promise<void>

export interface MarkdownRenderContext {
  app: App
  component: Component
  render: MarkdownRenderFunction
  createComponent?: () => Component
}
