const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('remindlyDesktop', {
  saveUrl: (url) => ipcRenderer.invoke('save-url', url),
  currentUrl: () => ipcRenderer.invoke('current-url')
})
