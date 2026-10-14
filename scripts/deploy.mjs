import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const sourceDirectory = path.join(pluginRoot, 'dist')
const targetDirectory = process.env.OBSIDIAN_PLUGIN_DIR
const pluginFiles = ['main.js', 'manifest.json', 'styles.css']

if (!targetDirectory) {
  throw new Error('Set OBSIDIAN_PLUGIN_DIR to the Flashcard Genius plugin directory in your vault.')
}

const sourceFiles = (await readdir(sourceDirectory)).sort()
if (sourceFiles.join('\n') !== pluginFiles.slice().sort().join('\n')) {
  throw new Error(`Refusing to deploy unexpected output: ${sourceFiles.join(', ')}`)
}

await mkdir(targetDirectory, { recursive: true })
for (const fileName of pluginFiles) {
  await copyFile(path.join(sourceDirectory, fileName), path.join(targetDirectory, fileName))
}

console.log(`Deployed Flashcard Genius to ${targetDirectory}`)
