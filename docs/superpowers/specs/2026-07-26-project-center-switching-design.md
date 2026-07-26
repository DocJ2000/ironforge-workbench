# Project Center And Switching Design

## Goal

Turn the start page into a project center and make the selected project explicit throughout every upload, delivery, and retrieval workflow.

## Start Page

The start page is titled “这台电脑上的项目”. A compact notice summarizes projects that need attention. The main list shows project name, local path, GitLab project path, current branch, local-change count, remote status, delivery-review status, and last update.

Each project row has one primary action: “设为当前项目”. The current project is visually marked and cannot be selected again. Secondary commands are “添加本地已有项目” and “从云端下载项目”.

## Global Project Selection

The existing repository switcher in the sidebar becomes an actual popover. It lists the same registered projects and changes the global current-project selection. All task tabs inherit the global selection.

Because the current backend is bound to one repository path, only the live repository is operational in this preview. Demonstration entries are marked “尚未连接”; selecting them is allowed for inspecting project-center behavior, but task pages block write operations and direct the user back to project configuration. This prevents a visual selection from targeting the wrong real repository.

## Workflow Confirmation

“上传整个工程” starts with “确认项目”, followed by branch, file review, update title, and final confirmation. “提交图纸到铁炉堡” and “获取项目和图纸” also show the selected project identity before actions. Final confirmation includes project name and local folder.

## Future Backend Boundary

The production project registry will store a stable project ID, local path, GitLab URL, SSH-key reference, and default download directory. Every repository and delivery API request will carry the project ID; the backend resolves only registered IDs and never trusts an arbitrary path from the browser.

## Safety

- Switching projects never writes files.
- Unconnected projects cannot commit, push, tag, upload attachments, or create MRs.
- Removing a project from the app never deletes its local folder.
- The preview does not change the mechanical repository.
