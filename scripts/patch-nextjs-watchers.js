/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Post-install patch for Next.js to fix EMFILE "too many open files" on macOS.
 *
 * Root cause: Turbopack opens thousands of files during startup compilation,
 * creating a transient FD spike that exceeds macOS kern.maxfilesperproc (10240).
 * Watchpack's fs.watch() calls fail with EMFILE during this spike.
 *
 * Fix: Patch every error propagation path in the compiled Watchpack to silently
 * drop EMFILE errors. The dev server works fine despite failed watchers (hot
 * reload still functions for the vast majority of files).
 *
 * Runs automatically via the "postinstall" hook in package.json.
 */

const fs = require('fs')
const path = require('path')

const watchpackPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'compiled',
  'watchpack',
  'watchpack.js'
)

if (!fs.existsSync(watchpackPath)) {
  process.exit(0)
}

let content = fs.readFileSync(watchpackPath, 'utf8')
const original = content
let patchCount = 0

/**
 * Helper: replace a string, incrementing patchCount on success.
 * Returns true if replacement happened.
 */
function patch(from, to, _label) {
  if (content.includes(from)) {
    content = content.replace(from, to)
    patchCount++
    return true
  }
  return false
}

// ─── Patch 1: DirectWatcher error EVENT handler ───
// Suppress EMFILE on the fs.watch error event so it never reaches DirectoryWatcher
patch(
  't.on("error",(e=>{for(const t of this.watchers){t.emit("error",e)}}))',
  't.on("error",(e=>{if(e&&e.code==="EMFILE")return;for(const t of this.watchers){t.emit("error",e)}}))',
  'DirectWatcher error event'
)

// ─── Patch 2: DirectWatcher CATCH block ───
// When fs.watch() throws synchronously, suppress EMFILE before it's forwarded
patch(
  '}catch(e){process.nextTick((()=>{for(const t of this.watchers){t.emit("error",e)}}))}d++}add',
  '}catch(e){if(!e||e.code!=="EMFILE"){process.nextTick((()=>{for(const t of this.watchers){t.emit("error",e)}}))}}d++}add',
  'DirectWatcher catch block'
)

// ─── Patch 3: RecursiveWatcher error EVENT handler ───
// Same pattern but using mapWatcherToPath keys
patch(
  't.on("error",(e=>{for(const t of this.mapWatcherToPath.keys()){t.emit("error",e)}}))',
  't.on("error",(e=>{if(e&&e.code==="EMFILE")return;for(const t of this.mapWatcherToPath.keys()){t.emit("error",e)}}))',
  'RecursiveWatcher error event'
)

// ─── Patch 4: RecursiveWatcher CATCH block ───
// Suppress synchronous EMFILE from recursive fs.watch
patch(
  '}catch(e){process.nextTick((()=>{for(const t of this.mapWatcherToPath.keys()){t.emit("error",e)}}))}d++',
  '}catch(e){if(!e||e.code!=="EMFILE"){process.nextTick((()=>{for(const t of this.mapWatcherToPath.keys()){t.emit("error",e)}}))}}d++',
  'RecursiveWatcher catch block'
)

// ─── Patch 5: onWatcherError in DirectoryWatcher ───
// Last line of defense — if EMFILE somehow reaches the error handler, silently return
patch(
  'console.error("Watchpack Error (watcher): "+e)}this.onDirectoryRemoved("watch error")',
  'console.error("Watchpack Error (watcher): "+e)}if(e&&e.code==="EMFILE")return;this.onDirectoryRemoved("watch error")',
  'DirectoryWatcher.onWatcherError'
)

if (content !== original) {
  fs.writeFileSync(watchpackPath, content)
  console.log(`\x1b[32m✓ Patched Watchpack EMFILE handling (${patchCount} patches)\x1b[0m`)
} else if (patchCount === 0) {
  // Check if patches are already present
  if (content.includes('e.code==="EMFILE"')) {
    // Already patched from a previous run
  } else {
    console.warn(
      '\x1b[33m⚠ Could not patch Watchpack — compiled code structure may have changed\x1b[0m'
    )
  }
}
