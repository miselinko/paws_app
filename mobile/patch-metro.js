const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function patchPkg(pkgName, subpath) {
  const pkgPath = path.join('node_modules', pkgName, 'package.json')
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  if (!pkg.exports) return
  if (pkg.exports[subpath]) return
  // Find the actual file
  const filePath = subpath.replace('./', '') + '.js'
  const fullFile = path.join('node_modules', pkgName, filePath)
  if (!fs.existsSync(fullFile)) {
    console.log(`SKIP (file missing): ${pkgName} ${subpath}`)
    return
  }
  pkg.exports[subpath] = './' + filePath
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  console.log(`Patched: ${pkgName} -> ${subpath}`)
}

let attempts = 0
while (attempts < 20) {
  attempts++
  console.log(`\n--- Attempt ${attempts} ---`)
  let output = ''
  try {
    output = execSync('node node_modules/expo/bin/cli start --non-interactive 2>&1', {
      timeout: 8000,
      encoding: 'utf8'
    })
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '') + (e.message || '')
  }

  const match = output.match(/Package subpath '([^']+)' is not defined by "exports" in ([^\n]+package\.json)/)
  if (!match) {
    if (output.includes('Starting Metro') || output.includes('Metro waiting')) {
      console.log('\n✅ Expo started successfully!')
    } else {
      console.log('No more export errors. Output:', output.slice(0, 300))
    }
    break
  }

  const subpath = match[1]
  const pkgJsonPath = match[2].replace(/\\/g, '/')
  const pkgName = pkgJsonPath.replace(/.*node_modules\//, '').replace('/package.json', '')
  console.log(`Missing: ${pkgName} -> ${subpath}`)
  patchPkg(pkgName, subpath)
}
