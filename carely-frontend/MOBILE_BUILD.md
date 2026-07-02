# Building Carely Android APK

## Method: Capacitor (Recommended)

### Step 1 - Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

### Step 2 - Initialize Capacitor
npx cap init Carely com.carely.app --web-dir=build

### Step 3 - Build React App
npm run build

### Step 4 - Add Android Platform
npx cap add android

### Step 5 - Sync
npx cap sync

### Step 6 - Open in Android Studio
npx cap open android

### Step 7 - Build APK in Android Studio
Build → Build Bundle/APK → Build APK

### Step 8 - Upload to GitHub Releases
Upload the generated APK to GitHub releases so users can download it.

## Requirements
- Android Studio installed
- Java JDK 17
- Android SDK

After APK is built upload to GitHub releases and update the
download link in LandingPage.js
