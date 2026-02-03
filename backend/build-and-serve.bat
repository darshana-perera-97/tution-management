@echo off
REM Script to build React app and start the server on Windows

echo Building React application...
cd ..\frontend
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo Starting backend server...
    cd ..\backend
    node server.js
) else (
    echo Build failed! Please check the errors above.
    exit /b 1
)

