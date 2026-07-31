const fs = require("fs")
const path = require("path")

const rnDir = path.join(__dirname, "node_modules", "react-native", "Libraries")

if (!fs.existsSync(rnDir)) {
  console.warn("[postinstall] react-native/Libraries not found, skipping")
  process.exit(0)
}

const files = fs.readdirSync(rnDir, { recursive: true, withFileTypes: true })

let count = 0
for (const entry of files) {
  if (!entry.isFile()) continue
  if (!entry.name.endsWith(".android.js")) continue

  const fullPath = path.join(entry.parentPath, entry.name)
  const jsPath = fullPath.replace(/\.android\.js$/, ".js")

  if (!fs.existsSync(jsPath)) {
    fs.copyFileSync(fullPath, jsPath)
    count++
  }
}

console.log(`[postinstall] Created ${count} missing .js stubs for react-native web compatibility`)
