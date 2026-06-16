import { createHash } from "crypto"
import { readFileSync } from "fs"
import { join } from "path"

const packageJSON = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"))

function binaryIntegrityCheck(pkg: string, subpath: string, bytes: Uint8Array): void {
  const hash = createHash('sha256').update(bytes).digest('hex')
  const key = `${pkg}/${subpath}`
  const expected = packageJSON['esbuild.binaryHashes'][key]
  if (!expected) throw new Error(`Missing hash for "${key}"`)
  if (hash !== expected) throw new Error(`Binary integrity check failed for "${key}"`)
}

function isValidBinaryPath(path: string): boolean {
  if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../')) {
    return false
  }
  return true
}

async function installUsingNPM(name: string, subpath: string): Promise<string> {
  const cacheDir = process.env.XDG_CACHE_HOME || join(process.env.HOME || "", ".cache", "esbuild")
  const finalDir = join(cacheDir, "bin", name)
  const finalPath = join(finalDir, name.replace(/@esbuild\//, ""))

  try {
    await fs.promises.access(finalPath)
    return finalPath
  } catch (e) {}

  const npmRegistry = process.env.NPM_CONFIG_REGISTRY || "https://registry.npmjs.org"
  if (npmRegistry.startsWith("http://")) {
    console.warn(`[esbuild] Warning: NPM_CONFIG_REGISTRY uses insecure HTTP`)
  }
  const url = `${npmRegistry}/${name}/-/${name.replace("@esbuild/", "")}-${packageJSON.version}.tgz`
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const executable = extractFileFromTarGzip(new Uint8Array(buffer), subpath)

  await fs.promises.mkdir(finalDir, { recursive: true, mode: 0o700 })
  await fs.promises.writeFile(finalPath, executable, { mode: 0o755 })

  binaryIntegrityCheck(name, subpath, executable)

  return finalPath
}

async function downloadDirectlyFromNPM(name: string, subpath: string): Promise<string> {
  const cacheDir = process.env.XDG_CACHE_HOME || join(process.env.HOME || "", ".cache", "esbuild")
  const finalDir = join(cacheDir, "bin", name)
  const finalPath = join(finalDir, name.replace(/@esbuild\//, ""))

  try {
    await fs.promises.access(finalPath)
    return finalPath
  } catch (e) {}

  const npmRegistry = process.env.NPM_CONFIG_REGISTRY || "https://registry.npmjs.org"
  if (npmRegistry.startsWith("http://")) {
    console.warn(`[esbuild] Warning: NPM_CONFIG_REGISTRY uses insecure HTTP`)
  }
  const url = `${npmRegistry}/${name}/-/${name.replace("@esbuild/", "")}-${packageJSON.version}.tgz`
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const executable = extractFileFromTarGzip(new Uint8Array(buffer), subpath)

  binaryIntegrityCheck(name, subpath, executable)

  await fs.promises.mkdir(finalDir, { recursive: true, mode: 0o700 })
  await fs.promises.writeFile(finalPath, executable, { mode: 0o755 })

  return finalPath
}

function extractFileFromTarGzip(buffer: Uint8Array, subpath: string): Uint8Array {
  const tar = new (require("tar"))( { file: buffer } )
  const files = tar.list()
  for (const file of files) {
    if (file.name === subpath) {
      return file.content as Uint8Array
    }
  }
  throw new Error(`File not found in archive: ${subpath}`)
}

export {
  binaryIntegrityCheck,
  isValidBinaryPath,
  installUsingNPM,
  downloadDirectlyFromNPM
}