import { pr, spawn } from './utils.mjs'
import fs from 'fs-extra'
import archiver from 'archiver'

const buildName = 'chrome-mv3-prod.zip'
const buildOutputDist = pr('../.output/chrome-mv3')
const outputDir = pr(`../build/${buildName}`)
fs.removeSync(buildOutputDist)
fs.removeSync(outputDir)

async function main() {
  await spawn('npx', ['wxt', 'build'])

  // 打包zip
  const archive = archiver('zip', {
    zlib: { level: 9 },
  })
  archive.pipe(fs.createWriteStream(outputDir))
  archive.directory(buildOutputDist, false)

  await archive.finalize()
}

main()
