import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, 'icons/icon.png'),
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle backend server management
async function startBackend() {
  try {
    const backendPath = path.join(app.getAppPath(), '../backend/src/main.py');
    const { spawn } = require('child_process');
    
    const backendProcess = spawn('python', [backendPath], {
      detached: true,
      stdio: 'ignore',
      cwd: path.join(app.getAppPath(), '../backend')
    });
    
    backendProcess.unref();
    console.log('Backend server started');
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

// Auto-update checks
async function checkForUpdates() {
  // Update checks would be implemented here
}

app.whenReady().then(async () => {
  // Start backend server
  await startBackend();
  
  await createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Cleanup backend process
  // Implementation would depend on your backend management strategy
});

// IPC handlers for frontend-backend communication
ipcMain.handle('start-backend', async () => {
  try {
    await startBackend();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-health', async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/health');
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
});