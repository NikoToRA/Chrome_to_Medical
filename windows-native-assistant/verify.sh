#!/bin/bash
# Windows Native Assistant - Code Structure Verification Script

echo "========================================"
echo "Windows Native Assistant"
echo "Code Structure Verification"
echo "========================================"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (MISSING)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (MISSING)"
        return 1
    fi
}

MISSING_COUNT=0

echo "Checking project structure..."
echo ""

# Project files
echo "[Project Files]"
check_file "$SRC_DIR/WindowsNativeAssistant.csproj" "WindowsNativeAssistant.csproj" || ((MISSING_COUNT++))
check_file "$SRC_DIR/App.xaml" "App.xaml" || ((MISSING_COUNT++))
check_file "$SRC_DIR/App.xaml.cs" "App.xaml.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/AppController.cs" "AppController.cs" || ((MISSING_COUNT++))
echo ""

# Core modules
echo "[Core Modules]"
check_dir "$SRC_DIR/Core" "Core/" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Core/HotkeyManager.cs" "HotkeyManager.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Core/PasteEngine.cs" "PasteEngine.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Core/AIClient.cs" "AIClient.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Core/Logger.cs" "Logger.cs" || ((MISSING_COUNT++))
echo ""

# Models
echo "[Models]"
check_dir "$SRC_DIR/Models" "Models/" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Models/AppState.cs" "AppState.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Models/Template.cs" "Template.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Models/PasteResult.cs" "PasteResult.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Models/GenerateRequest.cs" "GenerateRequest.cs" || ((MISSING_COUNT++))
echo ""

# UI
echo "[UI]"
check_dir "$SRC_DIR/UI" "UI/" || ((MISSING_COUNT++))
check_file "$SRC_DIR/UI/MainPanel.xaml" "MainPanel.xaml" || ((MISSING_COUNT++))
check_file "$SRC_DIR/UI/MainPanel.xaml.cs" "MainPanel.xaml.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/UI/SettingsWindow.xaml" "SettingsWindow.xaml" || ((MISSING_COUNT++))
check_file "$SRC_DIR/UI/SettingsWindow.xaml.cs" "SettingsWindow.xaml.cs" || ((MISSING_COUNT++))
echo ""

# Config
echo "[Config]"
check_dir "$SRC_DIR/Config" "Config/" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Config/AppConfig.cs" "AppConfig.cs" || ((MISSING_COUNT++))
check_file "$SRC_DIR/Config/ConfigManager.cs" "ConfigManager.cs" || ((MISSING_COUNT++))
echo ""

# Build scripts
echo "[Build & Documentation]"
check_file "$PROJECT_ROOT/build.bat" "build.bat" || ((MISSING_COUNT++))
check_file "$PROJECT_ROOT/README_IMPLEMENTATION.md" "README_IMPLEMENTATION.md" || ((MISSING_COUNT++))
echo ""

# Design documents
echo "[Design Documents]"
check_file "$PROJECT_ROOT/design/basic_design.md" "basic_design.md" || ((MISSING_COUNT++))
echo ""

echo "========================================"
if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Project structure is complete."
    echo ""
    echo "Next steps:"
    echo "1. Create app.ico icon file in src/ directory"
    echo "2. Build on Windows machine:"
    echo "   cd windows-native-assistant"
    echo "   build.bat"
    echo "3. Run the executable from publish/ folder"
else
    echo -e "${RED}Found $MISSING_COUNT missing files/directories${NC}"
    echo ""
    echo "Please check the missing items above."
fi
echo "========================================"
