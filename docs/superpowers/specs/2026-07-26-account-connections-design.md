# Account And Connections Design

## Navigation

Remove the sidebar project switcher and repository-source badge. Project selection remains explicit inside upload and retrieval workflows. The sidebar footer becomes a link to “账户与连接”.

## GitLab

The account page explains the two required credentials:

- SSH private key for clone, pull, and push.
- GitLab personal access token for reviewers, MR creation, and attachments.

The preview accepts GitLab URL, token, and SSH-key path in memory only. It never writes secrets to project files, localStorage, or ordinary JSON configuration. Production persistence requires Windows Credential Manager integration.

## Ironforge

Ironforge uses company SSO through `sso.lab.tp`. The app opens `http://ironforge.holo.tp/projects`; login and logout remain managed by the system browser. Publishing through merged GitLab MRs does not require a second in-app Ironforge credential.

Internal Ironforge API access will require a separately registered desktop OAuth client using Authorization Code with PKCE. The website client ID and redirect URI must not be reused.
