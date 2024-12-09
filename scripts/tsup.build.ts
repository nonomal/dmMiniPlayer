import { defineConfig } from 'tsup'
import { shareConfig } from './tsup.shared'
import { getDefinesObject } from '@apad/env-tools/lib/bundler.js'
import { omit } from '@root/utils'

export default defineConfig({
  ...shareConfig,
  entry: omit(shareConfig.entry, ['inject']),
  treeshake: true,
  minify: true,
  sourcemap: false,
  define: {
    ...shareConfig.define,
    ...getDefinesObject('prod'),
  },
})
