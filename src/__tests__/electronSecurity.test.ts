/**
 * @vitest-environment node
 */
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

const nodeRequire = createRequire(import.meta.url)

type BuildCsp = (isDev: boolean) => string

function loadBuildCsp(): BuildCsp {
  const mod = nodeRequire('../../electron/security.cjs') as {
    buildContentSecurityPolicy: BuildCsp
  }
  return mod.buildContentSecurityPolicy
}

describe('electron security CSP', () => {
  const buildContentSecurityPolicy = loadBuildCsp()
  const originalDevUrl = process.env.VITE_DEV_SERVER_URL

  afterEach(() => {
    if (originalDevUrl === undefined) {
      delete process.env.VITE_DEV_SERVER_URL
    } else {
      process.env.VITE_DEV_SERVER_URL = originalDevUrl
    }
  })

  it('production policy is strict (no unsafe-eval)', () => {
    const policy = buildContentSecurityPolicy(false)
    expect(policy).toContain("script-src 'self'")
    expect(policy).not.toContain('unsafe-eval')
    expect(policy).toContain("object-src 'none'")
  })

  it('dev policy allows the Vite dev server and HMR', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173'
    const policy = buildContentSecurityPolicy(true)
    expect(policy).toContain('http://localhost:5173')
    expect(policy).toContain('ws://localhost:5173')
    expect(policy).toContain("'unsafe-eval'")
  })

  it('dev policy uses VITE_DEV_SERVER_URL when set', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:3000'
    const policy = buildContentSecurityPolicy(true)
    expect(policy).toContain('http://127.0.0.1:3000')
    expect(policy).toContain('ws://127.0.0.1:3000')
  })
})
