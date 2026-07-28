!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!pragma warning disable 6020

Var RemoveUserDataCheckbox
Var RemoveUserData

!macro preInit
  SetRegView 64
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 existing_install
  ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 existing_install

  SetRegView 32
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 existing_install
  ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 existing_install

  IfFileExists "D:\*.*" 0 existing_install

  SetRegView 64
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\ironforge-workbench"
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\ironforge-workbench"

  SetRegView 32
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\ironforge-workbench"
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "D:\ironforge-workbench"

existing_install:
  SetRegView 64
!macroend

!macro customUnWelcomePage
  UninstPage custom un.UserDataPage un.UserDataPageLeave
!macroend

Function un.UserDataPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 26u "卸载 Ironforge Workbench"
  Pop $0
  ${NSD_CreateCheckbox} 0 38u 100% 18u "清除本地用户个人配置"
  Pop $RemoveUserDataCheckbox
  ${NSD_Uncheck} $RemoveUserDataCheckbox
  ${NSD_CreateLabel} 18u 60u 92% 34u "将清除服务器地址、访问码、身份钥匙、项目列表和登录状态。不会删除任何项目、图纸或模型文件。"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function un.UserDataPageLeave
  ${NSD_GetState} $RemoveUserDataCheckbox $RemoveUserData
FunctionEnd

!macro customUnInstall
  ${If} $RemoveUserData == ${BST_CHECKED}
    RMDir /r "$APPDATA\ironforge-workbench-data"
  ${EndIf}
!macroend
