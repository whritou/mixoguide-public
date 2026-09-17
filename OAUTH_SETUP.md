# OAuth Google Setup for Mobile App

## OAuth Flow Overview

The mobile app uses native Google Sign-In and sends a Google ID token to the
backend. The legacy mobile browser authorization-code flow has been removed.

1. The mobile app opens the native Google account picker.
2. Google returns an ID token to the app.
3. The app posts the ID token to `/api/auth/mobile/oauth/google/id-token`.
4. The backend verifies the token signature, issuer, audience, and expiry.
5. The backend links or creates the same Prisma `Account` row used by NextAuth
   web Google OAuth (`provider = google`, `providerAccountId = Google sub`).
6. The backend returns the standard mobile `accessToken`, `refreshToken`, and
   `user` payload.

This means a user can:

- Sign up with Google on the web, then sign in with Google on mobile.
- Sign up with Google on mobile, then sign in with Google on the web.

## Environment Setup

### Required Environment Variables

```env
AUTH_GOOGLE_ID=your-google-web-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

`AUTH_GOOGLE_ID` is used to validate mobile ID-token audiences. The secret is
still needed for web Google OAuth through NextAuth.

### Obtain Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the OAuth consent screen.
4. Create an OAuth 2.0 Web application client.
5. Set that Web client ID in `AUTH_GOOGLE_ID` and
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
6. For Android builds, make sure `mobile/google-services.json` contains the
   same Web OAuth client, or set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` explicitly.

Mobile Google ID-token sign-in does not require the removed mobile callback
redirect URIs.

### Mobile App Configuration

`mobile/app.config.js` adds the `@react-native-google-signin/google-signin`
plugin and exposes `extra.googleWebClientId` to the app. It also validates that
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches the Web OAuth client found in
`google-services.json` when both are present.

## Security Features

- Google ID-token signature verification via Google's JWKS endpoint.
- Issuer, audience, expiry, and issued-at validation.
- Verified Google email required.
- Account linking through the same Prisma `Account` table used by web OAuth.
- Google avatar URLs restricted to known Google CDN hosts.
- Mobile refresh tokens remain device-bound through the `X-Device-Id` header.

## Testing OAuth Flow

1. Launch the mobile app.
2. On the sign-in screen, tap "Continue with Google".
3. Select a Google account in the native account picker.
4. The app posts the ID token to the backend.
5. The app stores the returned mobile tokens and navigates to the home screen.

### Troubleshooting

**"Google sign-in is not available for this build."**
- The app could not load or configure native Google Sign-In.
- Check `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `google-services.json`, and the
  native Google Sign-In plugin configuration.

**"Google sign-in is not configured for this Android build."**
- Google Sign-In returned a developer configuration error.
- Verify the Android package name and SHA fingerprints in Google Cloud/Firebase.

**"Google sign-in did not return an identity token for this build."**
- Native sign-in completed, but no ID token was available.
- Confirm the Web client ID is configured as the `webClientId`.

**"This email is already registered with another provider."**
- The Google email already belongs to an email/password account.
- The user can sign in with email/password or create a different account.

## API Endpoints

### Google ID Token Login (`POST`)

- **URL**: `/api/auth/mobile/oauth/google/id-token`
- **Headers**: `X-Device-Id: <device id>`
- **Body**: `{ "idToken": "google.jwt" }`
- **Response**:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt...",
    "refreshToken": "token...",
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "image": "...",
      "role": "USER"
    }
  }
}
```

## Verification Checklist

- [ ] Google OAuth Web client created in Google Cloud Console.
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` added to the backend env.
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` added to the mobile build env.
- [ ] Android package name and SHA fingerprints are registered for native sign-in.
- [ ] User can sign in with Google on mobile.
- [ ] User is created or updated in the database.
- [ ] Access token can make authenticated API calls.
- [ ] Refresh token works for token renewal.
