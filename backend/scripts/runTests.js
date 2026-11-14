import { spawn } from 'child_process'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)
const jestMain = require.resolve('jest')
const jestBin = path.resolve(path.dirname(jestMain), '../bin/jest.js')

const child = spawn(process.execPath, ['--experimental-vm-modules', jestBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
