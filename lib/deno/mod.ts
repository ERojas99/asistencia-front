import { crypto } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { spawn } from "node:child_process"

const packageJSON = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))

function getCachePath(name: string): { finalPath: string; finalDir: string } {
  const cacheDir = process.env.XDG_CACHE_HOME || join(process.env.HOME || "", ".cache", "esbuild")
  const finalDir = join(cacheDir, "bin", name)
  const finalPath = join(finalDir, name.replace(/@esbuild\//, ""))
  return { finalPath, finalDir }
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

function binaryIntegrityCheck(pkg: string, subpath: string, bytes: Uint8Array): void {
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
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

async function installFromNPM(name: string, subpath: string): Promise<string> {
  const { finalPath, finalDir } = getCachePath(name)
  try { await Deno.stat(finalPath); return finalPath } catch (e) {}

  const npmRegistry = Deno.env.get("NPM_CONFIG_REGISTRY") || "https://registry.npmjs.org"
  if (npmRegistry.startsWith("http://")) {
    console.warn(`[esbuild] Warning: NPM_CONFIG_REGISTRY uses insecure HTTP`)
  }
  const url = `${npmRegistry}/${name}/-/${name.replace("@esbuild/", "")}-${packageJSON.version}.tgz`
  const buffer = await fetch(url).then(r => r.arrayBuffer())
  const executable = extractFileFromTarGzip(new Uint8Array(buffer), subpath)

  await Deno.mkdir(finalDir, { recursive: true, mode: 0o700 })
  await Deno.writeFile(finalPath, executable, { mode: 0o755 })

  binaryIntegrityCheck(name, subpath, executable)

  return finalPath
}

async function main() {
  const version = packageJSON.version
  const platform = Deno.build.os === "linux" ? "linux-x64" : Deno.build.os === "darwin" ? "darwin-x64" : "win32-x64"
  const name = `@esbuild/${platform}`
  const subpath = `bin/${platform}/esbuild"

  if (!isValidBinaryPath(subpath)) {
    throw new Error(`Invalid binary path: ${subpath}`)
  }

  const binPath = await installFromNPM(name, subpath)

  const child = spawn(binPath, { args: [`--service=${version}`], ... })
  await child.output()
}

main().catch(console.error)