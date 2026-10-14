import type { App, Component } from 'obsidian'
import { createContext, type ReactNode } from 'react'

// The browser preview can supply its math renderer without bundling it in Obsidian.
export type FallbackMathRenderer = (expression: string) => ReactNode
export const FallbackMathContext = createContext<FallbackMathRenderer | null>(null)

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
