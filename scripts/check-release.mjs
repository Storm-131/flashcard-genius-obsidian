import { checkRelease } from './release-utils.mjs'

try {
  const args = process.argv.slice(2)
  const options = { build: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--build') options.build = true
    else if (arg === '--repository' && args[index + 1]) options.repository = args[++index]
    else if (!arg.startsWith('--') && !options.tag) options.tag = arg
    else throw new Error('Usage: npm run release:check -- [x.y.z] [--build] [--repository owner/repo]')
  }
  const version = await checkRelease(undefined, options)
  console.log(`Release metadata${options.build ? ' and artifacts' : ''} verified for ${version}.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
