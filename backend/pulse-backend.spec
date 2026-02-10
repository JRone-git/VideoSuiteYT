# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_dynamic_libs

binaries = []
binaries += collect_dynamic_libs('soundfile')


a = Analysis(
    ['src/main.py'],
    pathex=[],
    binaries=binaries,
    datas=[],
    hiddenimports=['uvicorn', 'uvicorn.loops', 'uvicorn.protocols', 'uvicorn.protocols.http', 'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors', 'pydantic', 'aiohttp', 'numpy', 'soundfile'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['torch', 'torchaudio', 'torchvision', 'tensorflow', 'transformers', 'accelerate', 'bitsandbytes', 'scipy', 'matplotlib', 'pandas', 'sympy', 'onnxruntime', 'faster_whisper'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='pulse-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='pulse-backend',
)
