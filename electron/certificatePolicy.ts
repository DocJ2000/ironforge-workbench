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
