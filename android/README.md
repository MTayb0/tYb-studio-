# Android wrapper

The Android app uses a WebView to display the shared web app bundled under `app/src/main/assets/www/`. The GitHub Actions workflow copies the repository's web files into that folder before building.

The generated APK is a debug APK for testing and sideloading. A Play Store release needs a separately managed signing key and release configuration. Never commit signing keys or passwords.
