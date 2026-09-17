# Mobile Security Checklist

## Firebase Android API Key

`google-services.json` contains a Firebase API key that is intentionally shipped in the APK. Treat it as public and restrict it in Google Cloud:

1. Open Google Cloud Console > APIs & Services > Credentials.
2. Select the Android API key from `mobile/google-services.json`.
3. Set Application restrictions to Android apps.
4. Add package name `com.mixoguide.app`.
5. Add the SHA-1 and SHA-256 fingerprints for the release/app signing certificate.
6. Under API restrictions, allow only the Firebase APIs this app uses.

## Android App Links

Google OAuth uses the verified app link `https://mixoguide.com/auth/google` in production. Set `ANDROID_CERT_SHA256_FINGERPRINTS` on the web backend to a comma-separated list of Android signing SHA-256 fingerprints so `/.well-known/assetlinks.json` can verify the app.
