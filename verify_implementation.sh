#!/bin/bash
# Offline-First Architecture - Verification Script
# This script verifies all required files are in place

echo "=========================================="
echo "Offline-First Architecture - Verification"
echo "=========================================="
echo ""

BASEPATH="C:/Users/capit/Documents/4391_home_auto/family-planner"
PASSED=0
FAILED=0

# Function to check file
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$BASEPATH/$file" ]; then
        echo "✅ PASS: $description"
        echo "   Path: $file"
        PASSED=$((PASSED+1))
    else
        echo "❌ FAIL: $description"
        echo "   Path: $file"
        FAILED=$((FAILED+1))
    fi
}

echo "🔍 Checking Core Services..."
check_file "frontend/src/services.indexeddb.ts" "IndexedDB Service"
check_file "frontend/src/services.offline-sync.ts" "Offline Sync Service"

echo ""
echo "🔍 Checking React Hooks..."
check_file "frontend/src/useOfflineMode.ts" "useOfflineMode Hook"

echo ""
echo "🔍 Checking UI Components..."
check_file "frontend/src/components/OfflineIndicator.tsx" "OfflineIndicator Component"
check_file "frontend/src/components/TouchOptimized.TouchButton.tsx" "TouchButton Component"
check_file "frontend/src/components/TouchOptimized.TouchInput.tsx" "TouchInput Component"
check_file "frontend/src/components/TouchOptimized.TouchCard.tsx" "TouchCard Component"
check_file "frontend/src/components/TouchOptimized.GestureHandler.tsx" "GestureHandler Component"

echo ""
echo "🔍 Checking i18n Configuration..."
check_file "frontend/src/i18n.config.ts" "i18n Config"
check_file "frontend/src/locales_en_translation.json" "English Translations"
check_file "frontend/src/locales_fr_translation.json" "French Translations"

echo ""
echo "🔍 Checking PWA Support..."
check_file "frontend/src/manifest.json" "PWA Manifest"
check_file "frontend/src/service-worker.js" "Service Worker"

echo ""
echo "🔍 Checking Configuration Files..."
check_file "frontend/index.html" "Updated HTML"
check_file "frontend/src/main.tsx" "Updated Main.tsx"

echo ""
echo "🔍 Checking Documentation..."
check_file "OFFLINE_FIRST_INDEX.md" "Index Documentation"
check_file "OFFLINE_FIRST_AT_A_GLANCE.md" "At a Glance Guide"
check_file "OFFLINE_FIRST_QUICK_GUIDE.md" "Quick Guide"
check_file "OFFLINE_FIRST_IMPLEMENTATION.md" "Implementation Guide"
check_file "OFFLINE_FIRST_COMPLETE.md" "Complete Guide"
check_file "OFFLINE_FIRST_FINAL_DELIVERABLE.md" "Final Deliverable"

echo ""
echo "=========================================="
echo "📊 VERIFICATION RESULTS"
echo "=========================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📁 Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 ALL FILES VERIFIED - READY FOR PRODUCTION!"
else
    echo ""
    echo "⚠️  Some files are missing. Please check above."
fi
