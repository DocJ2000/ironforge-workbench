# Real Project Registry Design

## Goal

Replace the fixed repository path with a persistent, backend-owned registry. Every repository and delivery operation resolves a stable project ID to an approved local Git root.

## Registry

Each record contains a generated ID, canonical local root, display name, GitLab remote, and creation timestamp. The backend validates a proposed folder using `git rev-parse --show-toplevel`, canonicalizes it, prevents duplicates, and writes the registry atomically outside engineering repositories.

The development default repository is seeded as a trusted record. Adding or removing a project changes only the registry; removing never deletes local files.

## API Boundary

The frontend may send only `projectId`. It never sends a filesystem path to scan, commit, push, tag, upload, or create an MR. Unknown IDs return 404 before any Git or filesystem operation begins.

Project-management endpoints list, add, and remove registry records. Existing endpoints accept `projectId` as a query parameter for GET requests and inside POST request bodies.

## Storage

Development uses the current user application-data directory. Tests inject temporary registry files and temporary Git repositories. Production Electron will place the file under `app.getPath("userData")`.

## Safety

- No arbitrary-path execution.
- Atomic registry writes.
- Canonical paths prevent duplicate aliases.
- Project removal never removes folders.
- All development write tests use temporary repositories.
