import { describe, it, expect } from 'vitest'

import { config } from './proxy'

// Regression: ISSUE-001 — middleware bloqueava fontes SF Pro Display (redirect 307 p/ /install)
// Found by /qa on 2026-07-16
// Report: .gstack/qa-reports/qa-report-smartzap-2026-07-16.md
describe('proxy matcher config', () => {
  const matcherRegex = new RegExp(config.matcher[0])

  it('excludes self-hosted font files from the auth/bootstrap gate', () => {
    expect(matcherRegex.test('/fonts/SFProDisplay-Bold.woff2')).toBe(false)
    expect(matcherRegex.test('/fonts/SFProDisplay-Regular.woff2')).toBe(false)
    expect(matcherRegex.test('/fonts/SFProDisplay-Black.woff2')).toBe(false)
    expect(matcherRegex.test('/fonts/some-other-font.woff')).toBe(false)
    expect(matcherRegex.test('/fonts/some-other-font.ttf')).toBe(false)
    expect(matcherRegex.test('/fonts/some-other-font.otf')).toBe(false)
  })

  it('still gates regular pages and API routes', () => {
    expect(matcherRegex.test('/dashboard')).toBe(true)
    expect(matcherRegex.test('/api/campaigns')).toBe(true)
    expect(matcherRegex.test('/install')).toBe(true)
  })

  it('continues excluding other static assets (images, manifest, sw)', () => {
    expect(matcherRegex.test('/icons/icon-192.png')).toBe(false)
    expect(matcherRegex.test('/manifest.json')).toBe(false)
    expect(matcherRegex.test('/sw.js')).toBe(false)
  })
})
