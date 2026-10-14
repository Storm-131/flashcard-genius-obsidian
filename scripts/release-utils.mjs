import assert from 'node:assert/strict'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
export const packageDirectories = ['', 'packages/core', 'packages/ui']
export const releaseFiles = ['main.js', 'manifest.json', 'styles.css']
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export function assertVersion(version) {
  assert.equal(typeof version, 'string', 'The version must be a string.')
  assert.match(version, versionPattern, 'Use an exact x.y.z version without a v prefix or prerelease suffix.')
  assert.ok(version.split('.').every(part => Number.isSafeInteger(Number(part))), 'Version components are too large.')
}

export async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'))
}

async function writeJson(root, relativePath, value) {
  await writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`)
}

export async function checkRelease(root = repositoryRoot, { tag, build = false, repository } = {}) {
  if (repository !== undefined) {
    const config = await readJson(root, 'release.config.json')
    assert.equal(repository, config.repository, 'Release tags belong in the public plugin repository.')
  }
  const manifest = await readJson(root, 'manifest.json')
  assertVersion(manifest.version)
  assertVersion(manifest.minAppVersion)
  if (tag !== undefined) {
    assertVersion(tag)
    assert.equal(tag, manifest.version, 'The tag must exactly match the plugin version.')
  }
  const versions = await readJson(root, 'versions.json')
  assert.equal(versions[manifest.version], manifest.minAppVersion, 'The current version must map to minAppVersion.')
  for (const [version, minimum] of Object.entries(versions)) {
    assertVersion(version)
    assertVersion(minimum)
  }

  const lock = await readJson(root, 'package-lock.json')
  assert.equal(lock.version, manifest.version, 'The lockfile root version is inconsistent.')
  const packages = await Promise.all(packageDirectories.map(directory => readJson(root, path.join(directory, 'package.json'))))
  const localNames = new Set(packages.map(pkg => pkg.name))
  for (const [index, pkg] of packages.entries()) {
    const directory = packageDirectories[index]
    assert.equal(pkg.version, manifest.version, `${directory || 'root'}/package.json has an inconsistent version.`)
    const lockedPackage = lock.packages[directory]
    assert.equal(lockedPackage?.version, pkg.version, `The lockfile entry for ${directory || 'root'} is inconsistent.`)
    for (const dependencyType of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(pkg[dependencyType] ?? {})) {
        if (!localNames.has(name)) continue
        assert.equal(version, manifest.version, `The local dependency ${name} must use the shared version.`)
        assert.equal(lockedPackage[dependencyType]?.[name], version, `The locked dependency ${name} is inconsistent.`)
      }
    }
  }

  if (build) {
    const output = path.join(root, 'dist')
    assert.deepEqual((await readdir(output)).sort(), [...releaseFiles].sort(), 'The build must contain exactly the three release files.')
    assert.deepEqual(await readJson(root, 'dist/manifest.json'), manifest, 'The built manifest must match the repository.')
    for (const file of releaseFiles) {
      const info = await stat(path.join(output, file))
      assert.ok(info.isFile() && info.size > 0, `${file} must be a nonempty release file.`)
    }
  }
  return manifest.version
}

export async function prepareRelease(root = repositoryRoot, requested = 'patch') {
  const currentVersion = await checkRelease(root)
  const currentParts = currentVersion.split('.').map(Number)
  let nextVersion = requested
  if (['patch', 'minor', 'major'].includes(requested)) {
    const component = { major: 0, minor: 1, patch: 2 }[requested]
    const nextParts = currentParts.map((part, index) => index < component ? part : index === component ? part + 1 : 0)
    nextVersion = nextParts.join('.')
  }
  assertVersion(nextVersion)
  const nextParts = nextVersion.split('.').map(Number)
  const changedComponent = nextParts.findIndex((part, index) => part !== currentParts[index])
  assert.ok(changedComponent >= 0 && nextParts[changedComponent] > currentParts[changedComponent], 'The next release version must increase.')

  const manifest = await readJson(root, 'manifest.json')
  const versions = await readJson(root, 'versions.json')
  manifest.version = nextVersion
  assert.ok(!Object.hasOwn(versions, nextVersion), 'This version is already recorded in versions.json.')
  versions[nextVersion] = manifest.minAppVersion
  const packages = await Promise.all(packageDirectories.map(directory => readJson(root, path.join(directory, 'package.json'))))
  const localNames = new Set(packages.map(pkg => pkg.name))
  const lock = await readJson(root, 'package-lock.json')
  lock.version = nextVersion

  for (const [index, pkg] of packages.entries()) {
    const directory = packageDirectories[index]
    pkg.version = nextVersion
    lock.packages[directory].version = nextVersion
    for (const dependencyType of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(pkg[dependencyType] ?? {})) {
        if (!localNames.has(name)) continue
        pkg[dependencyType][name] = nextVersion
        lock.packages[directory][dependencyType][name] = nextVersion
      }
    }
    await writeJson(root, path.join(directory, 'package.json'), pkg)
  }
  await writeJson(root, 'package-lock.json', lock)
  await writeJson(root, 'manifest.json', manifest)
  await writeJson(root, 'versions.json', versions)
  await checkRelease(root)
  return nextVersion
}
