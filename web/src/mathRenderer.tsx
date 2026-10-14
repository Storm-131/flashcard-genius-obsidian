import katex from 'katex'

export function renderPreviewMath(expression: string) {
  return <span dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, {
    displayMode: false, output: 'htmlAndMathml', strict: 'ignore', throwOnError: false,
  }) }} />
}
