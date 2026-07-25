import { createJiti } from 'jiti'

const filepath = process.argv.at(-1)

if (!filepath) {
  throw new Error('Locale filepath is missing')
}

const flattenValues = (vals, prefix = '', flatVals = {}) => {
  for (const [key, value] of Object.entries(vals)) {
    const path = prefix ? (key === '_' ? prefix : `${prefix}.${key}`) : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenValues(value, path, flatVals)
    } else if (path) {
      flatVals[path] = value
    }
  }

  return flatVals
}

const originalWrite = process.stdout.write.bind(process.stdout)

try {
  process.stdout.write = () => true

  const jiti = createJiti(import.meta.url, {
    interopDefault: false,
  })

  const module = await jiti.import(filepath)
  let messages = module.default ?? module

  if (typeof messages === 'function') {
    messages = await messages()
  }

  const result = flattenValues(messages)

  process.stdout.write = originalWrite
  originalWrite(`${JSON.stringify(result)}\n`)
} catch (error) {
  process.stdout.write = originalWrite
  throw error
}
