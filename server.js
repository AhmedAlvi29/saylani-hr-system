// Root Server Entrypoint for Vercel, Node, and Render deployments
let cachedApp = null;

function getApp() {
  if (!cachedApp) {
    const serverModule = require('./server/dist/index');
    cachedApp = serverModule.default || serverModule;
  }
  return cachedApp;
}

module.exports = (req, res) => {
  const app = getApp();
  return app(req, res);
};
