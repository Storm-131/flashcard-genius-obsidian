import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkRelease, packageDirectories, prepareRelease, readJson, releaseFiles, repositoryRoot } from './release-utils.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flashcard-release-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const files = ['release.config.json', 'manifest.json', 'versions.json', 'package-lock.json',
    ...packageDirectories.map(directory => path.join(directory, 'package.json'))]
  for (const file of files) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await cp(path.join(repositoryRoot, file), path.join(root, file))
  }
  return root
}

async function changeJson(root, file, change) {
  const value = await readJson(root, file)
  change(value)
  await writeFile(path.join(root, file), JSON.stringify(value))
}

async function buildFixture(root) {
  const output = path.join(root, 'dist')
  await mkdir(output, { recursive: true })
  for (const file of releaseFiles) {
    await writeFile(path.join(output, file), file === 'manifest.json'
      ? await readFile(path.join(root, 'manifest.json')) : 'build output')
  }
}

test('the real repository has synchronized release metadata', () => checkRelease())

test('releases are restricted to the configured public repository', async t => {
  const root = await fixture(t)
  await checkRelease(root, { repository: 'Storm-131/flashcard-genius-obsidian' })
  await assert.rejects(checkRelease(root, { repository: 'Storm-131/Flashcard_Genius' }), /public plugin repository/)
})

test('prepares a patch entirely in a temporary repo and preserves release history', async t => {
  const root = await fixture(t)
  const oldVersion = await checkRelease(root)
  const previousVersions = await readJson(root, 'versions.json')
  const expected = oldVersion.split('.').map((part, index) => index === 2 ? Number(part) + 1 : part).join('.')
  assert.equal(await prepareRelease(root), expected)
  assert.equal(await checkRelease(root, { tag: expected }), expected)
  const versions = await readJson(root, 'versions.json')
  for (const [version, minimum] of Object.entries(previousVersions)) assert.equal(versions[version], minimum)
  await buildFixture(root)
  await checkRelease(root, { tag: expected, build: true })
})

test('prepares minor, major and exact versions with synchronized workspace dependencies', async t => {
  for (const requested of ['minor', 'major', '99.0.0']) {
    const root = await fixture(t)
    const version = await prepareRelease(root, requested)
    assert.equal(await checkRelease(root), version)
    const plugin = await readJson(root, 'package.json')
    assert.equal(plugin.dependencies['@flashcard-genius/core'], version)
    assert.equal(plugin.dependencies['@flashcard-genius/ui'], version)
  }
})

test('rejects invalid, prefixed and mismatched tags', async t => {
  const root = await fixture(t)
  for (const tag of ['v1.0.0', '1.0.0-beta.1', '01.0.0', '1.0', '99.0.0']) {
    await assert.rejects(checkRelease(root, { tag }))
  }
})

test('rejects a missing or incorrect current compatibility entry', async t => {
  const version = await checkRelease()
  for (const change of [versions => { delete versions[version] }, versions => { versions[version] = '9.0.0' }]) {
    const root = await fixture(t)
    await changeJson(root, 'versions.json', change)
    await assert.rejects(checkRelease(root), /minAppVersion/)
  }
})

test('rejects stale package, local dependency and lockfile versions', async t => {
  for (const [file, change] of [
    ['packages/ui/package.json', pkg => { pkg.version = '99.0.0' }],
    ['package.json', pkg => { pkg.dependencies['@flashcard-genius/core'] = '99.0.0' }],
    ['package-lock.json', lock => { lock.packages[''].version = '99.0.0' }],
    ['package-lock.json', lock => { lock.packages[''].dependencies['@flashcard-genius/ui'] = '99.0.0' }],
  ]) {
    const root = await fixture(t)
    await changeJson(root, file, change)
    await assert.rejects(checkRelease(root))
  }
})

test('rejects incomplete, empty and stale build output', async t => {
  const root = await fixture(t)
  await buildFixture(root)
  await checkRelease(root, { build: true })
  await writeFile(path.join(root, 'dist/extra.map'), 'extra')
  await assert.rejects(checkRelease(root, { build: true }), /exactly the three/)
  await rm(path.join(root, 'dist/extra.map'))
  await writeFile(path.join(root, 'dist/main.js'), '')
  await assert.rejects(checkRelease(root, { build: true }), /nonempty/)
  await buildFixture(root)
  await prepareRelease(root)
  await assert.rejects(checkRelease(root, { build: true }), /built manifest/)
})

test('invalid preparation leaves all version files unchanged', async t => {
  const root = await fixture(t)
  const before = await readFile(path.join(root, 'package-lock.json'), 'utf8')
  const version = await checkRelease(root)
  for (const requested of [version, '0.0.0', 'v9.0.0', '9.0.0-beta']) {
    await assert.rejects(prepareRelease(root, requested))
  }
  assert.equal(await readFile(path.join(root, 'package-lock.json'), 'utf8'), before)
  assert.equal(await checkRelease(root), version)
})
