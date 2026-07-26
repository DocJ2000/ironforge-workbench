# Secure GitLab Credentials Design

## Storage

Electron main uses `safeStorage` to encrypt the complete GitLab credential payload before writing it under the application user-data directory. The payload contains GitLab URL, token, SSH-key path, and optional SSH-key passphrase.

The renderer can save, clear, and query redacted status through narrow IPC handlers. It can never read the saved token or passphrase back.

## Browser Preview

The normal Vite browser preview does not persist credentials. It clearly reports that secure storage requires the desktop application.

## IPC

The preload bridge exposes:

- `credentials.status()`
- `credentials.save(input)`
- `credentials.clear()`

Inputs are validated in the main process. IPC status returns only `configured`, `baseUrl`, and `sshKeyPath`.

## External Authentication

Electron opens HTTPS links normally and explicitly permits the company Ironforge HTTP origin. Other HTTP links remain blocked.

## Future Use

GitLab API and Git command execution will request credentials inside the trusted main/backend process. Secrets will not be sent to renderer components after saving.
