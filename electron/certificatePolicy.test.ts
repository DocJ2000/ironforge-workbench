import { describe, expect, it } from 'vitest'
import {
  mayTrustInternalCertificate,
  mayTrustInternalCertificateForHosts,
  mayTrustEmbeddedNavigationCertificate,
} from './certificatePolicy'

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

describe('mayTrustEmbeddedNavigationCertificate', () => {
  it('allows an authority error only for a host registered by the embedded login flow', () => {
    const trustedHosts = new Set(['sso.example.test'])
    expect(mayTrustEmbeddedNavigationCertificate(
      'net::ERR_CERT_AUTHORITY_INVALID',
      'https://sso.example.test/login',
      trustedHosts,
    )).toBe(true)
    expect(mayTrustEmbeddedNavigationCertificate(
      'net::ERR_CERT_AUTHORITY_INVALID',
      'https://evil.example.test/login',
      trustedHosts,
    )).toBe(false)
    expect(mayTrustEmbeddedNavigationCertificate(
      'net::ERR_CERT_DATE_INVALID',
      'https://sso.example.test/login',
      trustedHosts,
    )).toBe(false)
  })
})

describe('mayTrustInternalCertificateForHosts', () => {
  it('allows an authority error only for a host reached by the embedded login flow', () => {
    const trustedHosts = new Set(['forge.example.test', 'sso.example.test'])

    expect(mayTrustInternalCertificateForHosts(
      'net::ERR_CERT_AUTHORITY_INVALID',
      'sso.example.test',
      trustedHosts,
    )).toBe(true)
    expect(mayTrustInternalCertificateForHosts(
      'net::ERR_CERT_AUTHORITY_INVALID',
      'other.example.test',
      trustedHosts,
    )).toBe(false)
  })

  it('never accepts expired or hostname-mismatched certificates', () => {
    const trustedHosts = new Set(['sso.example.test'])

    expect(mayTrustInternalCertificateForHosts(
      'net::ERR_CERT_DATE_INVALID',
      'sso.example.test',
      trustedHosts,
    )).toBe(false)
    expect(mayTrustInternalCertificateForHosts(
      'net::ERR_CERT_COMMON_NAME_INVALID',
      'sso.example.test',
      trustedHosts,
    )).toBe(false)
  })
})
