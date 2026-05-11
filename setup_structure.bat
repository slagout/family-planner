@echo off
REM Create directory structure
cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend"

echo Creating directories...
if not exist "src\services" mkdir "src\services"
if not exist "src\components\TouchOptimized" mkdir "src\components\TouchOptimized"  
if not exist "src\i18n" mkdir "src\i18n"
if not exist "public\locales\en" mkdir "public\locales\en"
if not exist "public\locales\fr" mkdir "public\locales\fr"

echo Directories created successfully!

REM Now create placeholder files
cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\src\services"
type nul > indexeddb.ts
type nul > offline-sync.ts

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\src"
type nul > useOfflineMode.ts

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\src\components"
type nul > OfflineIndicator.tsx

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\src\components\TouchOptimized"
type nul > TouchButton.tsx
type nul > TouchInput.tsx
type nul > TouchCard.tsx
type nul > GestureHandler.tsx

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\src\i18n"
type nul > config.ts

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\public"
type nul > manifest.json
type nul > service-worker.js

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\public\locales\en"
type nul > translation.json

cd /d "C:\Users\capit\Documents\4391_home_auto\family-planner\frontend\public\locales\fr"
type nul > translation.json

echo All files created!
