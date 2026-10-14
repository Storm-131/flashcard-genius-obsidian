import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ImageAssetsProvider, FallbackMathContext } from '@flashcard-genius/ui'
import { renderPreviewMath } from './mathRenderer'
import 'katex/dist/katex.min.css'
import './web.css'
import '@flashcard-genius/ui/styles.css'
import '../../src/plugin.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ImageAssetsProvider>
      <FallbackMathContext.Provider value={renderPreviewMath}>
        <App />
      </FallbackMathContext.Provider>
    </ImageAssetsProvider>
  </React.StrictMode>,
)
