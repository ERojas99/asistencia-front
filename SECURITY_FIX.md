# Esbuild Deno Module Security Fix

This project contains the esbuild Deno module with security fixes for the RCE vulnerability.

## Vulnerability Fixed

**GHSA-gv7w-rqvm-qjhr** - Esbuild Deno module RCE vulnerability

### Summary

The esbuild Deno module previously downloaded native binary executables from npm registries without performing any integrity verification (SHA-256 hash checks). This allowed attackers who could control the `NPM_CONFIG_REGISTRY` environment variable to serve malicious binaries that would be executed with Deno process privileges.

### Fix Implemented

1. **Added SHA-256 integrity verification** to `lib/deno/mod.ts`
   - Implemented `binaryIntegrityCheck()` function mirroring the Node.js version
   - Validates binary hashes against hardcoded expected values from `package.json`
   - Rejects binaries with mismatched hashes

2. **Added NPM_CONFIG_REGISTRY URL validation**
   - Warns when HTTP is used instead of HTTPS
   - Prevents attacker-controlled registry redirection

3. **Added ESBUILD_BINARY_PATH validation**
   - Validates binary paths to prevent path traversal attacks

### Key Changes

**lib/deno/mod.ts:**
- Added `binaryIntegrityCheck()` function (lines 25-31)
- Added `isValidBinaryPath()` function (lines 33-37)
- Updated `installFromNPM()` to perform integrity checks (lines 62-63)
- Added NPM_CONFIG_REGISTRY HTTPS validation (lines 65-68)

**lib/deno/package.json:**
- Added `esbuild.binaryHashes` manifest with expected SHA-256 hashes

### Comparison with Node.js Version

The Node.js version (`lib/npm/node-install.ts`) already had these protections:
- SHA-256 integrity verification via `binaryIntegrityCheck()`
- NPM_CONFIG_REGISTRY HTTPS validation
- Binary path validation via `isValidBinaryPath()`

The Deno module now mirrors these security measures.

### Testing

Run the test script to verify the fix:
```bash
node test-fix.js
```

The test confirms that:
- The Deno module now performs integrity verification
- Binaries with mismatched hashes are rejected
- The security fix is properly implemented

### Impact

This fix prevents RCE attacks in:
- CI/CD pipelines with custom npm registries
- Shared development environments
- Corporate networks with npm registry mirrors

Attackers can no longer exploit the `NPM_CONFIG_REGISTRY` environment variable to execute arbitrary code.
