/**
 * Marker used inside the MR description for an image that should render inline
 * at the paste position. Kept in its own module so the editor file only exports
 * components (React fast refresh).
 */
export function inlineImageMarker(fileName: string) {
  return `![${fileName}](ironforge-inline:${encodeURIComponent(fileName)})`
}
