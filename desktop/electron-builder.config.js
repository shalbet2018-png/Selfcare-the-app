// Windows installer settings. SELFCARE_VARIANT=business builds "Selfcare for Business"
// (its own app ID, so both apps can be installed side by side); anything else builds Selfcare.
const business = process.env.SELFCARE_VARIANT === 'business';
const name = business ? 'Selfcare for Business' : 'Selfcare';

module.exports = {
  appId: business ? 'com.selfcare.business' : 'com.selfcare.app',
  productName: name,
  copyright: 'Selfcare demo',
  asar: false,
  files: ['main.js', 'web/**/*'],
  directories: { output: 'release', buildResources: 'build' },
  extraMetadata: { productName: name, selfcareVariant: business ? 'business' : 'client' },
  win: {
    target: 'nsis',
    icon: business ? 'build/icon-business.png' : 'build/icon.png',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: name,
    artifactName: business ? 'Selfcare-Business-Demo-Setup-${version}.${ext}' : 'Selfcare-Demo-Setup-${version}.${ext}',
  },
};
