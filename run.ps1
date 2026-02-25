# VideoSuiteYT - Optimized Launcher for Windows
# Usage: .\run.ps1 [-Backend] [-Frontend] [-Dev]

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Dev,
    [switch]$Install,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

function Write-Status($message) {
    Write-Host "[VideoSuiteYT] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[VideoSuiteYT] $message" -ForegroundColor Green
}

function Write-Err($message) {
    Write-Host "[VideoSuiteYT] $message" -ForegroundColor Red
}

function Test-Command($cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    $missing = @()
    
    if (-not (Test-Command "python")) {
        $missing += "Python 3.11+"
    }
    
    if (-not (Test-Command "node")) {
        $missing += "Node.js 18+"
    }
    
    if (-not (Test-Command "ffmpeg")) {
        $missing += "FFmpeg 6.0+"
    }
    
    if ($missing.Count -gt 0) {
        Write-Err "Missing prerequisites:"
        foreach ($item in $missing) {
            Write-Host "  - $item" -ForegroundColor Yellow
        }
        exit 1
    }
    
    Write-Success "All prerequisites found"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing dependencies..."
    
    # Python backend
    Write-Status "Setting up Python virtual environment..."
    Push-Location $BackendDir
    
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    
    .\venv\Scripts\Activate.ps1
    pip install --upgrade pip
    pip install -r requirements.txt
    
    Pop-Location
    
    # Node.js frontend
    Write-Status "Installing Node.js dependencies..."
    Push-Location $FrontendDir
    
    npm install
    
    Pop-Location
    
    Write-Success "Dependencies installed"
}

# Start backend server
function Start-Backend {
    Write-Status "Starting backend server..."
    
    Push-Location $BackendDir
    
    if (-not (Test-Path "venv")) {
        Write-Err "Virtual environment not found. Run with -Install first."
        Pop-Location
        exit 1
    }
    
    .\venv\Scripts\Activate.ps1
    python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
    
    Pop-Location
}

# Start frontend development server
function Start-Frontend {
    Write-Status "Starting frontend development server..."
    
    Push-Location $FrontendDir
    
    if (-not (Test-Path "node_modules")) {
        Write-Err "Node modules not found. Run with -Install first."
        Pop-Location
        exit 1
    }
    
    npm run dev
    
    Pop-Location
}

# Start both in development mode
function Start-Dev {
    Write-Status "Starting in development mode..."
    
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        .\venv\Scripts\Activate.ps1
        python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
    } -ArgumentList $BackendDir
    
    Start-Sleep -Seconds 3
    
    # Start frontend
    Start-Frontend
    
    # Cleanup
    $backendJob | Remove-Job -Force
}

# Build production version
function Build-Production {
    Write-Status "Building for production..."
    
    # Build frontend
    Push-Location $FrontendDir
    npm run build
    Pop-Location
    
    # Build Electron app
    Push-Location $FrontendDir
    npm run electron:build
    Pop-Location
    
    Write-Success "Build complete"
}

# Main logic
if ($Install) {
    Test-Prerequisites
    Install-Dependencies
} elseif ($Build) {
    Build-Production
} elseif ($Backend) {
    Start-Backend
} elseif ($Frontend) {
    Start-Frontend
} elseif ($Dev) {
    Test-Prerequisites
    Start-Dev
} else {
    Write-Host @"
VideoSuiteYT Launcher

Usage:
  .\run.ps1 -Install     Install all dependencies
  .\run.ps1 -Backend     Start backend server only
  .\run.ps1 -Frontend    Start frontend dev server only
  .\run.ps1 -Dev         Start both in dev mode
  .\run.ps1 -Build       Build for production

"@
}