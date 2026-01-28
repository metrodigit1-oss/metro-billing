const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  // 1. Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Metro Digital Billing",
    webPreferences: {
      nodeIntegration: true,
    },
    autoHideMenuBar: true, // Hides the "File/Edit" menu like a modern app
  })

  // 2. Load the app
  // IN DEVELOPMENT: We load the local dev server
  mainWindow.loadURL('http://localhost:3000')

  // OPTIONAL: Open the DevTools (remove this line when finished)
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

// 3. App Lifecycle
app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})