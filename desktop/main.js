// Selfcare desktop (Windows) — wraps the web build of the app in its own window.
// The web build lives in ./web (created by `npx expo export --platform web --output-dir desktop/web`).
const { app, BrowserWindow, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WEB_ROOT = path.join(__dirname, 'web');
const START_URL = 'app://selfcare/';

// Serve the app from app://selfcare/ so its absolute paths (/_expo/..., /assets/...)
// and browser storage work as they do on a real website.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function serve(request) {
  const { pathname } = new URL(request.url);
  let file = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
  if (!file.startsWith(WEB_ROOT)) return new Response('Not found', { status: 404 });
  // Screens like /bookings are routes, not files: hand them to the app's index page.
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB_ROOT, 'index.html');
  return net.fetch(pathToFileURL(file).toString());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    title: 'Selfcare',
    backgroundColor: '#F4EEF0',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Links to other websites open in the normal browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(START_URL)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(START_URL);
  if (process.env.SELFCARE_SMOKE) smokeTest(win);
}

// Used by the GitHub build: open the app, check the home screen appears, then quit.
function smokeTest(win) {
  const out = process.env.SELFCARE_SMOKE_OUT;
  const finish = (code, message) => {
    if (out) fs.writeFileSync(out, message);
    app.exit(code);
  };
  const giveUp = setTimeout(() => finish(2, 'timed out waiting for the home screen'), 90000);
  win.webContents.once('did-finish-load', async () => {
    for (let i = 0; i < 60; i++) {
      const text = await win.webContents.executeJavaScript('document.body.innerText').catch(() => '');
      if (text.includes('Time for you.')) {
        clearTimeout(giveUp);
        return finish(0, 'ok: home screen rendered');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    protocol.handle('app', serve);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
