# Unified Upload Flow Design

## Navigation

The primary task navigation contains “上传项目”, “获取项目和图纸”, and “历史记录”. “提交图纸到铁炉堡” is no longer a separate tab.

## Upload Entry

“上传项目” always starts by selecting a project, even when the sidebar already has a current project. The current project is the default, but the user must see its name and local path.

The second choice is the upload goal:

- “只保存工程到 GitLab” commits and pushes valid project changes, then ends.
- “保存工程并提交图纸审核” commits and pushes the project plus selected OUTPUT packages, generates charge.json, optionally creates a delivery tag, then creates an MR with attachments and reviewers.

The Ironforge path does not block on SOURCE or REFERENCE changes. Those changes are included in the same GitLab synchronization before the MR is created.

## Retrieval

“获取项目和图纸” also starts with explicit project selection. The next step chooses clone, pull, or Ironforge published drawings, followed by the local destination.

## Ironforge Link

The canonical Ironforge project URL is `http://ironforge.holo.tp/projects`. Successful delivery screens and relevant retrieval actions link to this URL.

## Safety

Unconnected demonstration projects remain blocked from write operations. Every final confirmation shows project name and local folder.
