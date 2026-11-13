import { randomUUID } from 'node:crypto'
import { open, rename, rm } from 'node:fs/promises'

// Shared across service instances in this process. This is NOT a cross-process lock.
const queues = new Map()
export async function serialize(key, action) {
  const previous = queues.get(key) ?? Promise.resolve()
  const result = previous.catch(() => {}).then(action)
  queues.set(key, result)
  try { return await result } finally {
    if (queues.get(key) === result) queues.delete(key)
  }
}

/** Publish a complete file from a unique, exclusively-created sibling. */
export async function writeAtomic(path, content) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`
  let handle
  let created = false
  try {
    handle = await open(temp, 'wx', 0o600)
    created = true
    await handle.writeFile(content, 'utf8')
    await handle.close()
    handle = null
    await rename(temp, path)
  } finally {
    try { await handle?.close() } finally {
      if (created) await rm(temp, { force: true })
    }
  }
}
