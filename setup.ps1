#!/usr/bin/env pwsh
# YSS Video Creator - Windows Setup Script
# This script sets up the development environment on Windows 11

Write-Host "YSS Video Creator Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Host "PowerShell 7 or higher required. Please update." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Creating directory structure..." -ForegroundColor Yellow

# Create project directories
New-Item -ItemType Directory -Force -Path @(
    "backend/src"
    "frontend/src"
    "models"
    "projects"
) | Out-Null

Write-Host "✓ Directory structure created" -ForegroundColor Green

Write-Host "`nStep 2: Checking Python installation..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found. Please install Python 3.11+ from Microsoft Store" -ForegroundColor Red
    Write-Host "Or download from python.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStep 3: Checking Node.js installation..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install from nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 4: Checking NVIDIA GPU..." -ForegroundColor Yellow

# Check NVIDIA GPU
try {
    $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if ($nvidiaSmi) {
        nvidia-smi
        Write-Host "NVIDIA GPU detected ✓" -ForegroundColor Green
    } else {
        Write-Host "NVIDIA GPU not detected. Please install NVIDIA drivers." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error checking GPU: $_" -