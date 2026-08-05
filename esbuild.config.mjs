import esbuild from 'esbuild'
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.dirname(fileURLToPath(import.meta.url))
const outputDirectory = path.join(pluginRoot, 'dist')
const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

function disableUnusedReactScriptResources(contents, sourcePath) {
  // React 19 includes three script-element paths: preinit(), preinitModule(), and
  // rendering an async <script>. This plugin calls none of them and renders no
  // script elements, so fail closed if a future code path ever reaches one.
  const dynamicScriptCreation = /\b(?:ownerDocument|hoistableRoot)\.createElement\("script"\)/g
  const matches = contents.match(dynamicScriptCreation) ?? []
  if (matches.length !== 3) {
    throw new Error(`Expected three React DOM script creation paths in ${sourcePath}, found ${matches.length}`)
  }

  const guard = 'function rejectDynamicScriptCreation(){throw new Error("Dynamic script elements are disabled in Flashcard Genius.")}\n'
  return guard + contents.replace(dynamicScriptCreation, 'rejectDynamicScriptCreation()')
}

async function prepareOutput() {
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
}

async function finalizeOutput() {
  const generatedStyles = path.join(outputDirectory, 'main.css')
  const finalStyles = path.join(outputDirectory, 'styles.css')
  await rm(finalStyles, { force: true })
  await rename(generatedStyles, finalStyles)
  await copyFile(path.join(pluginRoot, 'manifest.json'), path.join(outputDirectory, 'manifest.json'))

  if (production) {
    const mainFile = path.join(outputDirectory, 'main.js')
    const mainContents = await readFile(mainFile, 'utf8')
    const sanitizedMain = mainContents.replaceAll('https:' + '//react.dev/errors/', 'about:blank#react-error-')
    if (/createElement\((['"])script\1\)/.test(sanitizedMain)) {
      throw new Error('Production bundle contains dynamic script element creation')
    }
    const namespaceUrls = new Set([
      'http://www.w3.org/1998/Math/MathML',
      'http://www.w3.org/1999/xlink',
      'http://www.w3.org/2000/svg',
      'http://www.w3.org/XML/1998/namespace'
    ])
    const runtimeUrls = [...sanitizedMain.matchAll(/https?:\/\/[A-Za-z0-9._/-]+/gi)]
      .map(match => match[0])
      .filter(url => !namespaceUrls.has(url))
    if (runtimeUrls.length > 0) {
      throw new Error('Production bundle contains a remote HTTP(S) URL')
    }
    await writeFile(mainFile, sanitizedMain)

    const files = (await readdir(outputDirectory)).sort()
    const expected = ['main.js', 'manifest.json', 'styles.css']
    if (files.join('\n') !== expected.join('\n')) {
      throw new Error(`Unexpected production output: ${files.join(', ')}`)
    }
  }
}

const config = {
  entryPoints: [path.join(pluginRoot, 'src/main.ts')],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  outfile: path.join(outputDirectory, 'main.js'),
  external: ['obsidian'],
  jsx: 'automatic',
  minify: production,
  sourcemap: false,
  legalComments: 'none',
  plugins: [{
    name: 'flashcard-genius-react-script-guard',
    setup(build) {
      build.onLoad({ filter: /react-dom-client\.(?:production|development)\.js$/ }, async args => ({
        contents: disableUnusedReactScriptResources(await readFile(args.path, 'utf8'), args.path),
        loader: 'js',
      }))
    }
  }, {
    name: 'flashcard-genius-output',
    setup(build) {
      build.onEnd(async result => {
        if (result.errors.length === 0) await finalizeOutput()
      })
    }
  }]
}

await prepareOutput()

if (watch) {
  const context = await esbuild.context(config)
  await context.watch()
  console.log('Watching the Flashcard Genius Obsidian plugin…')
} else {
  await esbuild.build(config)
}
