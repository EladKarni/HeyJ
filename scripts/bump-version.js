#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const plist = require('plist');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`✗ ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Get project root directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// File paths
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');
const IOS_PLIST_PATH = path.join(PROJECT_ROOT, 'ios', 'HeyJ', 'Info.plist');
const ANDROID_GRADLE_PATH = path.join(PROJECT_ROOT, 'android', 'app', 'build.gradle');

function validateBumpType(bumpType) {
  const validTypes = ['patch', 'minor', 'major'];
  if (!validTypes.includes(bumpType)) {
    error(`Invalid bump type: ${bumpType}. Must be one of: ${validTypes.join(', ')}`);
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      log('\nWorking directory has uncommitted changes:', 'yellow');
      console.log(status);
      log('\nPlease commit or stash your changes before bumping version.', 'yellow');
      process.exit(1);
    }
    success('Git working directory is clean');
  } catch (err) {
    error(`Failed to check git status: ${err.message}`);
  }
}

function readJSON(filePath) {
  try {
    return fs.readJSONSync(filePath);
  } catch (err) {
    error(`Failed to read ${filePath}: ${err.message}`);
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeJSONSync(filePath, data, { spaces: 2 });
    success(`Updated ${path.basename(filePath)}`);
  } catch (err) {
    error(`Failed to write ${filePath}: ${err.message}`);
  }
}

function updatePackageJson(newVersion) {
  const packageJson = readJSON(PACKAGE_JSON_PATH);
  packageJson.version = newVersion;
  writeJSON(PACKAGE_JSON_PATH, packageJson);
}

function updateAppJson(newVersion) {
  const appJson = readJSON(APP_JSON_PATH);
  appJson.expo.version = newVersion;
  writeJSON(APP_JSON_PATH, appJson);
}

function updateIosPlist(newVersion) {
  if (!fs.existsSync(IOS_PLIST_PATH)) {
    log(`iOS Info.plist not found at ${IOS_PLIST_PATH}, skipping...`, 'yellow');
    return 1;
  }

  try {
    const plistContent = fs.readFileSync(IOS_PLIST_PATH, 'utf8');
    const plistData = plist.parse(plistContent);

    // Update version string
    plistData.CFBundleShortVersionString = newVersion;

    // Increment build number
    const currentBuildNumber = parseInt(plistData.CFBundleVersion || '1', 10);
    const newBuildNumber = currentBuildNumber + 1;
    plistData.CFBundleVersion = newBuildNumber.toString();

    // Write back to file
    const newPlistContent = plist.build(plistData);
    fs.writeFileSync(IOS_PLIST_PATH, newPlistContent, 'utf8');

    success(`Updated iOS Info.plist (version: ${newVersion}, build: ${newBuildNumber})`);
    return newBuildNumber;
  } catch (err) {
    error(`Failed to update iOS Info.plist: ${err.message}`);
  }
}

function updateAndroidGradle(newVersion) {
  if (!fs.existsSync(ANDROID_GRADLE_PATH)) {
    log(`Android build.gradle not found at ${ANDROID_GRADLE_PATH}, skipping...`, 'yellow');
    return;
  }

  try {
    let gradleContent = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf8');
    let versionCodeUpdated = false;
    let versionNameUpdated = false;
    let newVersionCode;

    // Update versionCode (increment by 1)
    gradleContent = gradleContent.replace(
      /versionCode\s+(\d+)/,
      (match, currentCode) => {
        const currentVersionCode = parseInt(currentCode, 10);
        newVersionCode = currentVersionCode + 1;
        versionCodeUpdated = true;
        return `versionCode ${newVersionCode}`;
      }
    );

    // Update versionName
    gradleContent = gradleContent.replace(
      /versionName\s+"([^"]+)"/,
      () => {
        versionNameUpdated = true;
        return `versionName "${newVersion}"`;
      }
    );

    if (!versionCodeUpdated || !versionNameUpdated) {
      error('Failed to update Android build.gradle: versionCode or versionName not found');
    }

    fs.writeFileSync(ANDROID_GRADLE_PATH, gradleContent, 'utf8');
    success(`Updated Android build.gradle (version: ${newVersion}, code: ${newVersionCode})`);
  } catch (err) {
    error(`Failed to update Android build.gradle: ${err.message}`);
  }
}

function gitCommitAndTag(newVersion) {
  try {
    // Add all changed files
    execSync('git add package.json app.json ios/HeyJ/Info.plist android/app/build.gradle', {
      stdio: 'ignore',
    });

    // Commit
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
      stdio: 'ignore',
    });
    success(`Created commit: "chore: bump version to ${newVersion}"`);

    // Create tag
    execSync(`git tag v${newVersion}`, {
      stdio: 'ignore',
    });
    success(`Created git tag: v${newVersion}`);
  } catch (err) {
    error(`Failed to commit and tag: ${err.message}`);
  }
}

function main() {
  const bumpType = process.argv[2];

  if (!bumpType) {
    error('Usage: node bump-version.js <patch|minor|major>');
  }

  log('\n' + colors.bold + '🚀 Version Bump Script' + colors.reset + '\n');

  // Validate bump type
  validateBumpType(bumpType);

  // Check git status
  checkGitStatus();

  // Read current version
  const packageJson = readJSON(PACKAGE_JSON_PATH);
  const currentVersion = packageJson.version;
  info(`Current version: ${currentVersion}`);

  // Calculate new version
  const newVersion = semver.inc(currentVersion, bumpType);
  if (!newVersion) {
    error(`Failed to calculate new version from ${currentVersion} with bump type ${bumpType}`);
  }

  log(`${colors.bold}New version: ${newVersion}${colors.reset}\n`);

  // Update all files
  info('Updating configuration files...');
  updatePackageJson(newVersion);
  updateAppJson(newVersion);
  updateIosPlist(newVersion);
  updateAndroidGradle(newVersion);

  // Git operations
  log('');
  info('Committing changes and creating tag...');
  gitCommitAndTag(newVersion);

  // Success message
  log('\n' + colors.green + colors.bold + '✓ Version bump complete!' + colors.reset);
  log(`\n${colors.cyan}Next steps:${colors.reset}`);
  log('  1. Push changes: git push');
  log('  2. Push tags: git push --tags');
  log('  3. Build for stores:');
  log('     - iOS: eas build --platform ios --profile production');
  log('     - Android: eas build --platform android --profile production');
  log('  4. Submit to stores:');
  log('     - iOS: eas submit --platform ios --profile production');
  log('     - Android: eas submit --platform android --profile production\n');
}

main();
