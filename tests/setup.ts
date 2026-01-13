import fs from 'node:fs'

export default function () {
  // Keep tests runnable in clean environments (CI/local) where `.env` is not committed.
  if (fs.existsSync('.env'))
    fs.copyFileSync('.env', '.dev.vars')
  else if (fs.existsSync('.env.example'))
    fs.copyFileSync('.env.example', '.dev.vars')
  else
    fs.writeFileSync('.dev.vars', '')

  return () => {
    fs.rmSync('.dev.vars', { force: true })
  }
}
