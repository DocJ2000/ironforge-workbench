# Public Release And Updates Design

## Goal

Produce a public-source Windows desktop application that can be published through GitHub Releases, includes its Git runtime, and installs updates without modifying engineering project folders or losing local application settings.

## Release Boundary

The public repository contains application source, generic tests, build scripts, and public documentation. It must not contain organization domains, employee names, internal project names, workstation paths, credentials, private keys, or internal design notes.

The release audit scans both tracked source files and packaged artifacts. Test fixtures use reserved example domains and generic project names.

## Update Model

The packaged Electron application uses `electron-updater` with GitHub Releases. The GitHub owner and repository are injected when a release is built; they are not company configuration.

The application checks for a newer version after startup and when the user clicks "检查新版本". Checking does not download or install anything. Download and installation each require a clear user action. Installation restarts the application.

Development builds report that updates are only available in an installed release and never contact GitHub.

## Data Preservation

The stable Electron `appId` remains `com.ironforge.workbench`. Credentials, generated SSH identities, and helper files remain under Electron `userData`. The project registry remains under the user's home directory. NSIS does not delete application data on uninstall.

Immediately before applying an update, the application writes a dated backup containing the encrypted credential vault and project registry. SSH identities remain in place and are not copied into ordinary archives. Engineering project folders are never read for backup, moved, deleted, or rewritten by the updater.

## Failure Handling

Update failures remain on the current installed version and show a novice-readable message. A failed check or download never blocks GitLab or Ironforge workflows. The updater retains the most recent configuration backups with a bounded retention count.

## Publication

The build creates:

- a Windows NSIS installer;
- GitHub updater metadata and block map;
- a source archive generated from an audited clean commit.

Release creation requires a GitHub repository and credentials supplied only through the release environment. Secrets are never stored in source files.

Windows code signing is optional for the first internal trial but required before broad distribution to reduce SmartScreen warnings and strengthen update authenticity.

## Verification

Automated tests cover update state transitions, explicit-install protection, backup creation and retention, public-source scanning, and updater configuration. Full unit tests, lint, production build, public audit, and installer construction must pass before publication.
