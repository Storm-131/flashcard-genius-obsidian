import { prepareRelease } from './release-utils.mjs'

try {
  if (process.argv.length > 3) throw new Error('Usage: npm run release:prepare -- [patch|minor|major|x.y.z]')
  const version = await prepareRelease(undefined, process.argv[2] ?? 'patch')
  console.log(`Prepared ${version} locally. Run npm run release:verify before committing and pushing the release tag.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
