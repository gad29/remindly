const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

let mainWindow
const defaultAppUrl = 'https://remindly.ghsystems.work'
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json')

function normalizeUrl(value) {
  const candidate = String(value || '').trim().replace(/\/$/, '')
  const parsed = new URL(candidate)
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Use an http or https address')
  return parsed.toString().replace(/\/$/, '')
}

function readUrl() {
  if (process.env.REMINDLY_APP_URL) return normalizeUrl(process.env.REMINDLY_APP_URL)
  try { return normalizeUrl(JSON.parse(fs.readFileSync(settingsPath(), 'utf8')).appUrl) } catch { return defaultAppUrl }
}

async function loadApp() {
  const appUrl = readUrl()
  if (appUrl) await mainWindow.loadURL(appUrl)
  else await mainWindow.loadFile(path.join(__dirname, 'setup.html'))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 820,
    minHeight: 600,
    title: 'Remindly',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Remindly', submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
      { label: 'Change server', click: () => mainWindow.loadFile(path.join(__dirname, 'setup.html')) },
      { type: 'separator' }, { role: 'quit' }
    ] }
  ]))
  loadApp()
}

ipcMain.handle('current-url', () => readUrl() || '')
ipcMain.handle('save-url', async (_event, value) => {
  const appUrl = normalizeUrl(value)
  fs.writeFileSync(settingsPath(), JSON.stringify({ appUrl }, null, 2))
  await mainWindow.loadURL(appUrl)
  return true
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
