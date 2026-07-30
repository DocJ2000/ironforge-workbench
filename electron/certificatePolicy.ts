export function mayTrustInternalCertificate(
  error: string,
  requestUrl: string,
  configuredBaseUrl: string,
) {
  if (error !== 'net::ERR_CERT_AUTHORITY_INVALID') return false

  try {
    const request = new URL(requestUrl)
    const configured = new URL(configuredBaseUrl)
    return request.protocol === 'https:' && request.hostname === configured.hostname
  } catch {
    return false
  }
}

export function mayTrustInternalCertificateForHosts(
  error: string,
  hostname: string,
  trustedHosts: ReadonlySet<string>,
) {
  return error === 'net::ERR_CERT_AUTHORITY_INVALID'
    && trustedHosts.has(hostname.toLowerCase())
}

export function mayTrustEmbeddedNavigationCertificate(
  error: string,
  requestUrl: string,
  trustedHosts: ReadonlySet<string>,
) {
  if (error !== 'net::ERR_CERT_AUTHORITY_INVALID') return false
  try {
    const request = new URL(requestUrl)
    return request.protocol === 'https:'
      && trustedHosts.has(request.hostname.toLowerCase())
  } catch {
    return false
  }
}
