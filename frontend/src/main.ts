// Suppress GTK warnings by setting environment variables BEFORE app ready
process.env.GTK_A11Y_DEBUG = '0';
process.env.GTK_THEME = 'Adwaita';
process.env.GDK_BACKEND = 'x11';

// Disable GPU to eliminate GTK canvas issues
app.disableHardwareAcceleration();

// Disable GPU crash fixes and features that trigger GTK signals
app.commandLine.appendSwitch('disable-gpu-crash-reporter');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      spellcheck: false, // Disable spellcheck to reduce GTK dictionary loading
    },
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, 'icons/icon.png'),
    show: false, // Show after ready to prevent GTK initialization issues
  });

  // Safe show after DOM ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load from resources folder for production build
    await mainWindow.loadFile(path.join(process.resourcesPath, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle backend server management
async function startBackend() {
  try {
    const { spawn } = require('child_process');
    
    // Check if running in AppImage
    const isAppImage = process.resourcesPath.includes('.mount_');
    
    let backendExecutable: string;
    let backendCwd: string;
    let useBundledBackend = false;
    
    // Check for bundled backend (PyInstaller executable)
    const bundledBackendPath = path.join(process.resourcesPath, 'backend', 'pulse-backend');
    const bundledBackendExe = path.join(bundledBackendPath, 'pulse-backend');
    
    if (isAppImage && process.platform === 'linux' && fs.existsSync(bundledBackendExe)) {
      // Use bundled backend on Linux AppImage
      backendExecutable = bundledBackendExe;
      backendCwd = bundledBackendPath;
      useBundledBackend = true;
      console.log('Using bundled backend:', backendExecutable);
    } else if (isAppImage && process.platform === 'win32') {
      // Windows bundled backend
      const windowsBackendExe = path.join(process.resourcesPath, 'backend', 'pulse-backend.exe');
      if (fs.existsSync(windowsBackendExe)) {
        backendExecutable = windowsBackendExe;
        backendCwd = path.dirname(windowsBackendExe);
        useBundledBackend = true;
        console.log('Using bundled backend:', backendExecutable);
      }
    }
    
    if (!useBundledBackend) {
      // Fall back to Python-based backend
      const { PythonShell } = require('python-shell');
      
      let pythonCmd: string;
      let backendSrcPath: string;
      
      if (isAppImage) {
        pythonCmd = '/usr/bin/python3';
        backendSrcPath = path.join(process.resourcesPath, 'backend', 'src');
      } else {
        backendSrcPath = path.join(app.getAppPath(), '../backend/src');
        pythonCmd = path.join(app.getAppPath(), '../backend/venv/bin/python3');
      }
      
      console.log('Starting backend with Python...');
      console.log('Python:', pythonCmd);
      console.log('Backend src:', backendSrcPath);
      
      const env = {
        ...process.env,
        PYTHONPATH: backendSrcPath,
        BACKEND_SRC_PATH: backendSrcPath
      };
      
      const backendProcess = spawn(pythonCmd, [path.join(backendSrcPath, 'main.py')], {
        detached: true,
        stdio: 'pipe',
        cwd: path.dirname(backendSrcPath),
        env: env
      });
      
      backendProcess.stdout?.on('data', (data) => {
        console.log('Backend:', data.toString().trim());
      });
      
      backendProcess.stderr?.on('data', (data) => {
        console.error('Backend error:', data.toString().trim());
      });
      
      backendProcess.unref();
      console.log('Backend server started');
    } else {
      // Use bundled backend executable
      console.log('Starting bundled backend...');
      
      const backendProcess = spawn(backendExecutable, [], {
        detached: true,
        stdio: 'pipe',
        cwd: backendCwd,
        env: process.env
      });
      
      backendProcess.stdout?.on('data', (data) => {
        console.log('Backend:', data.toString().trim());
      });
      
      backendProcess.stderr?.on('data', (data) => {
        console.error('Backend error:', data.toString().trim());
      });
      
      backendProcess.unref();
      console.log('Bundled backend started');
    }
    
    // Wait a bit for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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