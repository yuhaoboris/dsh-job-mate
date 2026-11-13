import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(root, 'upstream-lock.json')
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(x => {
  if (x.isSymbolicLink()) throw Error('Symlinks are not allowed in upstream skills')
  return x.isDirectory() ? files(path.join(dir, x.name)) : [path.join(dir, x.name)]
}) }
if (process.argv.includes('--check')) {
  const lock = JSON.parse(fs.readFileSync(lockPath))
  const actual = [...files(path.join(root, 'skills')), ...files(path.join(root, 'vendor/job-mate'))].map(x => path.relative(root, x).replaceAll(path.sep, '/')).sort()
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(lock.files).sort())) throw Error('Upstream file list differs')
  for (const [name, hash] of Object.entries(lock.files)) if (digest(path.join(root, name)) !== hash) throw Error(`Upstream changed: ${name}`)
  console.log(`Verified job-mate ${lock.version} (${lock.commit ?? 'development snapshot'})`)
} else {
  const index = process.argv.indexOf('--source')
  if (index < 0 || !process.argv[index + 1]) throw Error('Use --source /path/to/job-mate [--development], or --check')
  const source = path.resolve(process.argv[index + 1])
  const development = process.argv.includes('--development')
  execFileSync(process.env.JOB_MATE_PYTHON || 'python3', [path.join(source, 'scripts/build.py'), '--check'], { stdio: 'inherit' })
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: source, encoding: 'utf8' }).trim()
  if (dirty && !development) throw Error('Commit upstream before creating a release snapshot')
  const commit = development ? null : execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim()
  const names = ['job-mate-apply', 'job-mate-followup']
  for (const name of names) {
    const dest = path.join(root, 'skills', name)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.cpSync(path.join(source, 'skills', name), dest, { recursive: true, filter: p => !p.includes('__pycache__') })
  }
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(root, 'vendor/job-mate/LICENSE'))
  const hashes = Object.fromEntries([...files(path.join(root, 'skills')), ...files(path.join(root, 'vendor/job-mate'))].sort().map(file => [path.relative(root, file).replaceAll(path.sep, '/'), digest(file)]))
  fs.writeFileSync(lockPath, JSON.stringify({ repository: 'https://github.com/yuhaoboris/job-mate', version: '2.0.0', commit, files: hashes }, null, 2) + '\n')
  console.log('Copied unmodified upstream skills and license')
}
