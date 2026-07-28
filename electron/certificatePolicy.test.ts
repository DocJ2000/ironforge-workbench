import { describe, expect, it } from 'vitest'
import { mayTrustInternalCertificate } from './certificatePolicy'

describe('mayTrustInternalCertificate', () => {
  it('allows only an authority error for the configured GitLab host', () => {
    expect(mayTrustInternalCertificate(
      'net::ERR_CERT_AUTHORITY_INVALID',
      'https://gitlfs.lab.tp/api/v4/user',
      'https://gitlfs.lab.tp',
    )).toBe(true)
  })

  it.each([
    ['net::ERR_CERT_DATE_INVALID', 'https://gitlfs.lab.tp/api/v4/user'],
    ['net::ERR_CERT_COMMON_NAME_INVALID', 'https://gitlfs.lab.tp/api/v4/user'],
    ['net::ERR_CERT_AUTHORITY_INVALID', 'https://evil.lab.tp/api/v4/user'],
    ['net::ERR_CERT_AUTHORITY_INVALID', 'https://gitlfs.lab.tp.evil.test/api/v4/user'],
  ])('rejects %s for %s', (error, url) => {
    expect(mayTrustInternalCertificate(
      error,
      url,
      'https://gitlfs.lab.tp',
    )).toBe(false)
  })
})
