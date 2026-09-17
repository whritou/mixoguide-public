#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
APP_DIR="$ANDROID_DIR/app"
KEYSTORE_TARGET="$APP_DIR/upload-keystore.jks"
AAB_PATH="$APP_DIR/build/outputs/bundle/release/app-release.aab"
APK_PATH="$APP_DIR/build/outputs/apk/release/app-release.apk"
AUTOLINKING_CACHE_DIR="$ANDROID_DIR/build/generated/autolinking"

EXPECTED_SHA1="${EXPECTED_SHA1:-AB:3F:62:B6:7B:1B:B6:00:E1:80:C1:68:3D:57:82:E9:A0:F4:65:01}"

JAVA_HOME_WIN="${JAVA_HOME:-C:\\Program Files\\Android\\Android Studio\\jbr}"
JAVA_BIN_BASH="/c/Program Files/Android/Android Studio/jbr/bin"
KEYTOOL_EXE="/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe"
ANDROID_HOME_DEFAULT="/c/Users/thomas/AppData/Local/Android/Sdk"

EXPECTED_GOOGLE_WEB_CLIENT_ID="${EXPECTED_GOOGLE_WEB_CLIENT_ID:-577333216992-2gm6eluc4jj7hla02oqjtmhv8vcfnbus.apps.googleusercontent.com}"
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="$EXPECTED_GOOGLE_WEB_CLIENT_ID"

BUILD_ARTIFACT_TYPE="AAB"
GRADLE_BUILD_TASK="app:bundleRelease"
ARTIFACT_PATH="$AAB_PATH"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--apk|--aab]

Builds a signed Android release artifact.

Options:
  --aab   Build an Android App Bundle for Play Store upload (default)
  --apk   Build a signed APK instead of an Android App Bundle
  -h, --help
          Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aab)
      BUILD_ARTIFACT_TYPE="AAB"
      GRADLE_BUILD_TASK="app:bundleRelease"
      ARTIFACT_PATH="$AAB_PATH"
      ;;
    --apk)
      BUILD_ARTIFACT_TYPE="APK"
      GRADLE_BUILD_TASK="app:assembleRelease"
      ARTIFACT_PATH="$APK_PATH"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 2
      ;;
  esac
  shift
done

SIGNATURE_REPORT="$(dirname "$ARTIFACT_PATH")/signature.txt"

prompt_secret() {
  local var_name="$1"
  local label="$2"

  printf "%s (hidden input; paste/type, then Enter): " "$label"
  IFS= read -rs "$var_name"
  echo
  export "$var_name"
}

prompt_value() {
  local var_name="$1"
  local label="$2"

  read -rp "$label: " "$var_name"
  export "$var_name"
}

verify_google_oauth_config() {
  local config_json
  local google_web_client_id

  config_json="$(node "$ROOT_DIR/node_modules/expo/bin/cli" config --json)"
  google_web_client_id="$(node -e "const fs = require('fs'); const config = JSON.parse(fs.readFileSync(0, 'utf8')); console.log(config.extra?.googleWebClientId || '')" <<<"$config_json")"

  if [[ "$google_web_client_id" != "$EXPECTED_GOOGLE_WEB_CLIENT_ID" ]]; then
    echo "Invalid EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in Expo config."
    echo "  expected: $EXPECTED_GOOGLE_WEB_CLIENT_ID"
    echo "  actual:   ${google_web_client_id:-<empty>}"
    exit 1
  fi

  echo "Google OAuth web client OK: $google_web_client_id"
}

validate_admob_values() {
  if [[ ! "$ADMOB_ANDROID_APP_ID" =~ ^ca-app-pub-[0-9]+~[0-9]+$ ]]; then
    echo "Invalid ADMOB_ANDROID_APP_ID. Expected format: ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
    exit 1
  fi

  if [[ ! "$EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID" =~ ^ca-app-pub-[0-9]+/[0-9]+$ ]]; then
    echo "Invalid EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID. Expected format: ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"
    exit 1
  fi
}

remove_build_dir() {
  local path="$1"
  local root_with_slash="$ROOT_DIR/"

  if [[ -d "$path" ]]; then
    case "$path/" in
      "$root_with_slash"*)
        echo "Removing stale build cache: $path"
        if ! rm -rf "$path"; then
          echo "Warning: could not fully remove $path. Some Windows process may still be holding a file lock."
        fi
        ;;
      *)
        echo "Refusing to remove path outside project: $path"
        exit 1
        ;;
    esac
  fi
}

verify_private_key_password() {
  local verifier_dir
  verifier_dir="$(mktemp -d)"
  local verifier_java="$verifier_dir/VerifyKeystoreKey.java"

  cat > "$verifier_java" <<'JAVA'
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Key;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.cert.Certificate;

public class VerifyKeystoreKey {
  public static void main(String[] args) throws Exception {
    String path = System.getenv("VERIFY_KEYSTORE_PATH");
    String storePassword = System.getenv("VERIFY_STORE_PASSWORD");
    String alias = System.getenv("VERIFY_KEY_ALIAS");
    String keyPassword = System.getenv("VERIFY_KEY_PASSWORD");

    KeyStore keyStore = KeyStore.getInstance("JKS");
    try (InputStream stream = Files.newInputStream(Path.of(path))) {
      keyStore.load(stream, storePassword.toCharArray());
    }

    if (!keyStore.containsAlias(alias)) {
      throw new IllegalArgumentException("Alias not found in keystore: " + alias);
    }

    Key key = keyStore.getKey(alias, keyPassword.toCharArray());
    if (key == null) {
      throw new IllegalArgumentException("Alias exists, but no private key was found: " + alias);
    }

    Certificate certificate = keyStore.getCertificate(alias);
    MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
    byte[] digest = sha1.digest(certificate.getEncoded());
    StringBuilder fingerprint = new StringBuilder();
    for (int index = 0; index < digest.length; index++) {
      if (index > 0) {
        fingerprint.append(":");
      }
      fingerprint.append(String.format("%02X", digest[index]));
    }

    System.out.println("Private key password OK.");
    System.out.println("Certificate SHA1: " + fingerprint);
  }
}
JAVA

  VERIFY_KEYSTORE_PATH="$KEYSTORE_TARGET" \
    VERIFY_STORE_PASSWORD="$MYAPP_UPLOAD_STORE_PASSWORD" \
    VERIFY_KEY_ALIAS="$MYAPP_UPLOAD_KEY_ALIAS" \
    VERIFY_KEY_PASSWORD="$MYAPP_UPLOAD_KEY_PASSWORD" \
    java "$verifier_java"

  rm -rf "$verifier_dir"
}

echo "== Google OAuth config =="
cd "$ROOT_DIR"
verify_google_oauth_config
echo

echo "== Android credentials =="
cd "$ROOT_DIR"
npx --yes eas-cli@latest credentials -p android
echo

downloaded_keystore="$ROOT_DIR/@mixoguide__mixoguide.jks"

if [[ -f "$KEYSTORE_TARGET" ]]; then
  echo "Keystore already exists: $KEYSTORE_TARGET"
elif [[ -f "$downloaded_keystore" ]]; then
  mv "$downloaded_keystore" "$KEYSTORE_TARGET"
  echo "Keystore moved to: $KEYSTORE_TARGET"
else
  echo "Missing keystore: $KEYSTORE_TARGET"
  echo "Download it from EAS credentials, then re-run this script."
  exit 1
fi

echo
echo "== Release signing values =="
export MYAPP_UPLOAD_STORE_FILE="${MYAPP_UPLOAD_STORE_FILE:-upload-keystore.jks}"
prompt_secret MYAPP_UPLOAD_STORE_PASSWORD "Keystore password"
prompt_value MYAPP_UPLOAD_KEY_ALIAS "Key alias"
prompt_secret MYAPP_UPLOAD_KEY_PASSWORD "Key password"

if [[ -z "$MYAPP_UPLOAD_STORE_PASSWORD" || -z "$MYAPP_UPLOAD_KEY_ALIAS" || -z "$MYAPP_UPLOAD_KEY_PASSWORD" ]]; then
  echo "Missing release signing value."
  exit 1
fi

echo
echo "Captured signing values:"
echo "  MYAPP_UPLOAD_STORE_FILE=$MYAPP_UPLOAD_STORE_FILE"
echo "  MYAPP_UPLOAD_STORE_PASSWORD=<hidden, ${#MYAPP_UPLOAD_STORE_PASSWORD} chars>"
echo "  MYAPP_UPLOAD_KEY_ALIAS=$MYAPP_UPLOAD_KEY_ALIAS"
echo "  MYAPP_UPLOAD_KEY_PASSWORD=<hidden, ${#MYAPP_UPLOAD_KEY_PASSWORD} chars>"

echo
echo "== AdMob production values =="
prompt_value ADMOB_ANDROID_APP_ID "ADMOB_ANDROID_APP_ID"
prompt_value EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID"
export EXPO_PUBLIC_ADMOB_USE_TEST_ADS=false
validate_admob_values

echo
echo "Captured AdMob values:"
echo "  ADMOB_ANDROID_APP_ID=$ADMOB_ANDROID_APP_ID"
echo "  EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID=$EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID"
echo "  EXPO_PUBLIC_ADMOB_USE_TEST_ADS=$EXPO_PUBLIC_ADMOB_USE_TEST_ADS"

echo
echo "== Android environment =="
export JAVA_HOME="$JAVA_HOME_WIN"
if [[ -d "$JAVA_BIN_BASH" ]]; then
  export PATH="$JAVA_BIN_BASH:$PATH"
fi

export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_HOME_DEFAULT}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [[ ! -f "$ANDROID_DIR/local.properties" ]]; then
  if command -v cygpath >/dev/null 2>&1; then
    sdk_dir="$(cygpath -m "$ANDROID_HOME")"
  else
    sdk_dir="$ANDROID_HOME"
  fi
  printf 'sdk.dir=%s\n' "$sdk_dir" > "$ANDROID_DIR/local.properties"
  echo "Created android/local.properties"
fi

export SENTRY_DISABLE_AUTO_UPLOAD=true
export SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD=true
export NODE_ENV="${NODE_ENV:-production}"

java -version
echo
echo "Using Android SDK: $ANDROID_HOME"
echo "Using release version from android/app/build.gradle:"
grep -E "version(Code|Name)" "$APP_DIR/build.gradle"

echo
echo "== Verify keystore =="
if [[ -x "$KEYTOOL_EXE" ]]; then
  "$KEYTOOL_EXE" -list -keystore "$KEYSTORE_TARGET" -storepass "$MYAPP_UPLOAD_STORE_PASSWORD" -alias "$MYAPP_UPLOAD_KEY_ALIAS" >/dev/null
else
  keytool -list -keystore "$KEYSTORE_TARGET" -storepass "$MYAPP_UPLOAD_STORE_PASSWORD" -alias "$MYAPP_UPLOAD_KEY_ALIAS" >/dev/null
fi
echo "Keystore password and alias OK."
verify_private_key_password

echo
echo "== Build $BUILD_ARTIFACT_TYPE =="
cd "$ANDROID_DIR"
./gradlew.bat --stop >/dev/null || true
remove_build_dir "$APP_DIR/.cxx"
remove_build_dir "$APP_DIR/build"
remove_build_dir "$AUTOLINKING_CACHE_DIR"
./gradlew.bat "$GRADLE_BUILD_TASK" --no-parallel -Dkotlin.compiler.execution.strategy=in-process -PreactNativeArchitectures=arm64-v8a

echo
echo "== Verify signature =="
if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "Build finished, but $BUILD_ARTIFACT_TYPE was not found at: $ARTIFACT_PATH"
  exit 1
fi

mkdir -p "$(dirname "$SIGNATURE_REPORT")"
if [[ -x "$KEYTOOL_EXE" ]]; then
  "$KEYTOOL_EXE" -printcert -jarfile "$ARTIFACT_PATH" | tee "$SIGNATURE_REPORT"
else
  keytool -printcert -jarfile "$ARTIFACT_PATH" | tee "$SIGNATURE_REPORT"
fi

if grep -q "$EXPECTED_SHA1" "$SIGNATURE_REPORT"; then
  echo
  echo "Signature OK: $EXPECTED_SHA1"
else
  echo
  echo "Warning: expected SHA1 was not found: $EXPECTED_SHA1"
  echo "Check $SIGNATURE_REPORT before uploading."
  exit 1
fi

echo
echo "$BUILD_ARTIFACT_TYPE ready:"
echo "$ARTIFACT_PATH"
