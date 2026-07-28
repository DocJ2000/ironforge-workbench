const owner = process.env.GH_OWNER
const repo = process.env.GH_REPO

if (!owner || !repo) {
  throw new Error('Set GH_OWNER and GH_REPO before building a release installer.')
}

module.exports = {
  appId: 'com.ironforge.workbench',
  productName: 'ironforge-workbench',
  asar: true,
  directories: { output: process.env.RELEASE_OUTPUT_DIR || 'release' },
  files: ['dist/**/*', 'dist-electron/**/*', 'package.json'],
  extraResources: [{ from: 'dist-runtime/git', to: 'git' }],
  publish: [{ provider: 'github', owner, repo }],
  win: {
    target: ['nsis'],
    icon: 'build/icon.png',
    artifactName: 'ironforge-workbench-Setup.${ext}',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    include: 'build/installer.nsh',
  },
}
