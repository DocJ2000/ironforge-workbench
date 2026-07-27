# Engineering Delivery Workbench

A novice-friendly Windows desktop application for working with GitLab projects and an organization delivery portal.

## What It Does

- downloads an existing GitLab project to a chosen local folder;
- remembers multiple local projects;
- guides explicit upload and download operations;
- prepares delivery packages and merge requests;
- stores access credentials with Windows encryption;
- bundles Git for Windows in the installer;
- checks, downloads, and installs GitHub Releases updates only after separate user actions.

The application does not include organization server addresses, project data, credentials, or private keys. Users enter their own organization settings on their computer.

## Development

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Set `IRONFORGE_REPOSITORY_PATH` to a disposable test repository when exercising project operations.

## Verification

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run audit:public-release
```

Automated tests use temporary repositories. Do not test write operations against a real engineering project.

## Windows Installer

Set the public GitHub Releases destination for the build:

```powershell
$env:GH_OWNER='example-owner'
$env:GH_REPO='engineering-delivery-workbench'
npm.cmd run package:win
```

Publishing additionally requires a release credential supplied through the build environment. Never store it in this repository.

Windows code signing is strongly recommended before broad distribution.
