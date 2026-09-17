#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_UNDER_TEST="$SCRIPT_DIR/build-aab-local.sh"
GOOGLE_WEB_CLIENT_ID="577333216992-2gm6eluc4jj7hla02oqjtmhv8vcfnbus.apps.googleusercontent.com"

TEMP_DIRS=""

cleanup() {
  for temp_dir in $TEMP_DIRS; do
    rm -rf "$temp_dir"
  done
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local needle="$1"
  local file="$2"

  if ! grep -q -- "$needle" "$file"; then
    echo "Expected to find '$needle' in $file" >&2
    echo "--- $file ---" >&2
    cat "$file" >&2
    fail "missing expected text"
  fi
}

assert_not_contains() {
  local needle="$1"
  local file="$2"

  if grep -q -- "$needle" "$file"; then
    echo "Did not expect to find '$needle' in $file" >&2
    echo "--- $file ---" >&2
    cat "$file" >&2
    fail "unexpected text found"
  fi
}

assert_file_exists() {
  local path="$1"

  if [[ ! -f "$path" ]]; then
    fail "expected file to exist: $path"
  fi
}

write_fake_expo_cli() {
  local mobile_root="$1"

  mkdir -p "$mobile_root/node_modules/expo/bin"
  cat > "$mobile_root/node_modules/expo/bin/cli" <<'JS'
if (process.argv[2] !== 'config') {
  console.error(`Unexpected fake Expo CLI command: ${process.argv.slice(2).join(' ')}`);
  process.exit(1);
}

process.stdout.write(JSON.stringify({
  extra: {
    googleWebClientId: process.env.EXPECTED_GOOGLE_WEB_CLIENT_ID,
  },
}));
JS
}

write_fake_npx() {
  local bin_dir="$1"

  cat > "$bin_dir/npx" <<'SH'
#!/usr/bin/env sh
echo "fake eas credentials"
SH
  chmod +x "$bin_dir/npx"
}

write_fake_gradle() {
  local android_dir="$1"
  local sh_exe
  sh_exe="$(cygpath -w "$(command -v sh)")"

  cat > "$android_dir/gradlew-shim.sh" <<'SH'
#!/usr/bin/env sh
set -eu

echo "$*" >> "$TEST_GRADLE_LOG"

case "$*" in
  *"--stop"*)
    exit 0
    ;;
  *"app:bundleRelease"*)
    artifact="app/build/outputs/bundle/release/app-release.aab"
    ;;
  *"app:assembleRelease"*)
    artifact="app/build/outputs/apk/release/app-release.apk"
    ;;
  *)
    echo "Unexpected Gradle invocation: $*" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$artifact")"
payload_dir="$(mktemp -d)"
echo "fake signed Android artifact" > "$payload_dir/payload.txt"
jar cf "$artifact" -C "$payload_dir" payload.txt >/dev/null
jarsigner \
  -keystore "app/$MYAPP_UPLOAD_STORE_FILE" \
  -storepass "$MYAPP_UPLOAD_STORE_PASSWORD" \
  -keypass "$MYAPP_UPLOAD_KEY_PASSWORD" \
  "$artifact" \
  "$MYAPP_UPLOAD_KEY_ALIAS" >/dev/null
rm -rf "$payload_dir"
SH
  chmod +x "$android_dir/gradlew-shim.sh"

  cat > "$android_dir/gradlew.bat" <<SH
@echo off
"$sh_exe" "%~dp0gradlew-shim.sh" %*
SH
}

create_keystore() {
  local keystore_path="$1"

  keytool -genkeypair \
    -alias upload \
    -keyalg RSA \
    -keysize 2048 \
    -validity 365 \
    -keystore "$keystore_path" \
    -storetype JKS \
    -storepass storepass \
    -keypass keypass1 \
    -dname "CN=MixoGuide Test" >/dev/null
}

read_keystore_sha1() {
  local keystore_path="$1"

  keytool -list -v \
    -keystore "$keystore_path" \
    -storepass storepass \
    -alias upload |
    sed -n 's/.*SHA[[:space:]]*1: //p' |
    head -n 1 |
    tr -d '\r'
}

setup_fixture() {
  local temp_dir
  temp_dir="$(mktemp -d)"
  TEMP_DIRS="$TEMP_DIRS $temp_dir"

  local mobile_root="$temp_dir/mobile"
  local android_dir="$mobile_root/android"
  local app_dir="$android_dir/app"
  local bin_dir="$temp_dir/bin"
  local android_home="$temp_dir/android-sdk"

  mkdir -p "$mobile_root/scripts" "$app_dir" "$bin_dir"
  mkdir -p "$android_dir/build/generated/autolinking" "$app_dir/.cxx" "$app_dir/build"
  mkdir -p "$android_home/platform-tools" "$android_home/cmdline-tools/latest/bin"
  touch "$android_dir/build/generated/autolinking/autolinking.json"
  touch "$app_dir/.cxx/stale-cache"
  touch "$app_dir/build/stale-cache"
  cp "$SCRIPT_UNDER_TEST" "$mobile_root/scripts/build-aab-local.sh"
  write_fake_expo_cli "$mobile_root"
  write_fake_npx "$bin_dir"
  write_fake_gradle "$android_dir"
  create_keystore "$app_dir/upload-keystore.jks"

  cat > "$app_dir/build.gradle" <<'GRADLE'
android {
    defaultConfig {
        versionCode 42
        versionName "1.2.3"
    }
}
GRADLE

  printf '%s\n' "$temp_dir"
}

run_build() {
  local fixture_dir="$1"
  shift

  local mobile_root="$fixture_dir/mobile"
  local app_dir="$mobile_root/android/app"
  local bin_dir="$fixture_dir/bin"
  local android_home="$fixture_dir/android-sdk"
  local output_log="$fixture_dir/output.log"
  local gradle_log="$fixture_dir/gradle.log"
  local expected_sha1
  expected_sha1="$(read_keystore_sha1 "$app_dir/upload-keystore.jks")"

  : > "$gradle_log"

  if ! printf '%s\n' \
    storepass \
    upload \
    keypass1 \
    ca-app-pub-1234567890123456~1234567890 \
    ca-app-pub-1234567890123456/1234567890 |
    PATH="$bin_dir:$PATH" \
    ANDROID_HOME="$android_home" \
    EXPECTED_SHA1="$expected_sha1" \
    EXPECTED_GOOGLE_WEB_CLIENT_ID="$GOOGLE_WEB_CLIENT_ID" \
    TEST_GRADLE_LOG="$gradle_log" \
    sh "$mobile_root/scripts/build-aab-local.sh" "$@" > "$output_log" 2>&1; then
    cat "$output_log" >&2
    fail "build script failed"
  fi
}

test_default_builds_aab() {
  local fixture_dir
  fixture_dir="$(setup_fixture)"

  run_build "$fixture_dir"

  assert_contains "app:bundleRelease" "$fixture_dir/gradle.log"
  assert_contains "--no-parallel" "$fixture_dir/gradle.log"
  assert_contains "-Dkotlin.compiler.execution.strategy=in-process" "$fixture_dir/gradle.log"
  assert_not_contains "app:assembleRelease" "$fixture_dir/gradle.log"
  assert_contains "AAB ready:" "$fixture_dir/output.log"
  assert_contains "Removing stale build cache: $fixture_dir/mobile/android/build/generated/autolinking" "$fixture_dir/output.log"
  assert_file_exists "$fixture_dir/mobile/android/app/build/outputs/bundle/release/app-release.aab"
}

test_apk_option_builds_apk() {
  local fixture_dir
  fixture_dir="$(setup_fixture)"

  run_build "$fixture_dir" --apk

  assert_contains "app:assembleRelease" "$fixture_dir/gradle.log"
  assert_not_contains "app:bundleRelease" "$fixture_dir/gradle.log"
  assert_contains "APK ready:" "$fixture_dir/output.log"
  assert_file_exists "$fixture_dir/mobile/android/app/build/outputs/apk/release/app-release.apk"
}

case "${1:-all}" in
  default)
    test_default_builds_aab
    ;;
  apk)
    test_apk_option_builds_apk
    ;;
  all)
    test_default_builds_aab
    test_apk_option_builds_apk
    ;;
  *)
    echo "Usage: $0 [default|apk|all]" >&2
    exit 2
    ;;
esac

echo "build-aab-local tests passed"
