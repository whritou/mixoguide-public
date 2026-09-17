# Android Smoke Checklist (Manual)

## Preconditions
- Android emulator running and visible in `adb devices`
- App installed and launchable
- Test account credentials available

## Flow 1: Onboarding and Sign-in
1. Launch app and verify onboarding renders.
2. Navigate through onboarding steps.
3. Open sign-in screen and authenticate.
4. Confirm tabs screen loads after login.

## Flow 2: Pantry
1. Open Pantry tab.
2. Add a pantry item.
3. Edit quantity or unit.
4. Trigger restock flow and verify request completes.

## Flow 3: Planner
1. Open Planner tab.
2. Create a planned cocktail.
3. Complete a planned cocktail.
4. Create a planned collection and confirm it appears.

## Flow 4: Profile
1. Open Profile tab.
2. Edit profile name/image.
3. Open change-password screen.
4. Sign out and verify auth screen appears.

## Evidence to capture
- One screenshot per flow
- `adb logcat -d -t 300 > smoke-logcat.txt`
