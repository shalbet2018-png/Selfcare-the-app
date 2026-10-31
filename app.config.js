// Reads app.json and, when EXPO_BASE_URL is set (the GitHub Pages build), serves the
// web build from that sub-path, e.g. https://<user>.github.io/<repo>/.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
