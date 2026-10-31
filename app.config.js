// Builds on app.json. Two settings come from the environment at build time:
//
//   APP_VARIANT=business  builds "Selfcare for Business" (dark bloom icon, own app ID,
//                         opens on the business dashboard) instead of the Selfcare client app.
//   EXPO_BASE_URL=/repo   serves the web build from a sub-path, e.g. https://<user>.github.io/<repo>/
//                         (used for the GitHub Pages build).
module.exports = ({ config }) => {
  const business = process.env.APP_VARIANT === 'business';
  const baseUrl = process.env.EXPO_BASE_URL;
  const night = '#221E27';

  const out = {
    ...config,
    extra: { ...config.extra, variant: business ? 'business' : 'client' },
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
  if (!business) return out;

  return {
    ...out,
    name: 'Selfcare for Business',
    scheme: 'selfcarebusiness',
    icon: './assets/images/icon-business.png',
    backgroundColor: night,
    ios: { ...config.ios, bundleIdentifier: 'com.selfcare.business' },
    android: {
      ...config.android,
      package: 'com.selfcare.business',
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        backgroundColor: night,
        foregroundImage: './assets/images/android-icon-business-foreground.png',
        backgroundImage: './assets/images/android-icon-business-background.png',
      },
    },
    web: { ...config.web, name: 'Selfcare for Business', shortName: 'Selfcare Biz', themeColor: night, backgroundColor: night },
    plugins: config.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
        ? ['expo-splash-screen', { ...plugin[1], backgroundColor: night, image: './assets/images/splash-icon-business.png' }]
        : plugin,
    ),
  };
};
