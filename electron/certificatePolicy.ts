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
