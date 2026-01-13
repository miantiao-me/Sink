import fs from 'node:fs'

export default function () {
  fs.copyFileSync('.env', '.dev.vars')

  return () => {
    fs.rmSync('.dev.vars')
  }
}
