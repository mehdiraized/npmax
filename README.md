# npMax

![screenshot-npMax-workspace](https://mehdiraized.github.io/npmax/dist/images/coverApp.png)

The open source desktop workspace for project dependencies and installed app updates across macOS, Windows, and Linux.

Runs on Linux, macOS and Windows.

## Download npMax v2.11.0

### macOS
**[Download for macOS Apple Silicon (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax-2.11.0-arm64.dmg)**

**[Download for macOS Intel (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax-2.11.0.dmg)**

### Windows
**[Download Installer for Windows](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax.Setup.2.11.0.exe)**

**[Download Portable for Windows](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax.2.11.0.exe)**

### Linux
**[Download AppImage (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax-2.11.0.AppImage)**

**[Download AppImage (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npMax-2.11.0-arm64.AppImage)**

**[Download .deb (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npmax_2.11.0_amd64.deb)**

**[Download .deb (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.11.0/npmax_2.11.0_arm64.deb)**

[All Releases](https://github.com/mehdiraized/npmax/releases/)

## Features

- Scan installed desktop applications on the current machine
- Surface app updates with cross-platform detection for macOS, Windows, and Linux
- Match popular apps like **Steam**, **Android Studio**, **VS Code**, **Docker**, **Discord**, **Spotify**, and more through a broader catalog
- View and manage **npm**, **yarn**, and **pnpm** packages from a `package.json`
- View and manage **Composer** (PHP) packages from a `composer.json`
- View and manage **Swift Package Manager** dependencies from a `Package.swift`
- View and manage **CocoaPods** dependencies from a `Podfile`
- View and manage **Android Gradle** dependencies from `build.gradle` / `build.gradle.kts`
- View and manage **Android Version Catalog** dependencies from `gradle/libs.versions.toml`
- View and manage **Flutter / Dart** dependencies from a `pubspec.yaml`
- View and manage **Go modules** from a `go.mod`
- View and manage **Rust crates** from a `Cargo.toml`
- View and manage **Ruby gems** from a `Gemfile`
- Detect outdated packages with live version checks against npm, Packagist, GitHub, Maven, CocoaPods, pub.dev, the Go proxy, crates.io, and RubyGems
- One-click version updates with semver prefix preservation (`^`, `~`, etc.)
- Lock file status indicator with Install / Sync button
- Installed Apps dashboard with search, filters, update badges, and refresh actions
- Supports multiple projects in a sidebar
- Cross-platform: macOS, Linux, Windows

### Installed apps support

npMax v3 adds a new system-wide view for desktop applications:

- Scans installed apps from the current operating system instead of requiring a project folder first
- Detects updates from native package managers where possible, including Homebrew Casks, winget, Flatpak, and Snap
- Falls back to a curated app catalog with platform-specific identifiers and official release sources
- Shows installed version, latest detected version, update source, and suggested update command when available
- Keeps the legacy multi-project dependency workflow intact beside the new Installed Apps area

### Supported project files

npMax automatically detects supported project manifests and displays the appropriate editor:

- `package.json` for npm, yarn, and pnpm projects
- `composer.json` for Composer projects
- `Package.swift` for Swift Package Manager projects
- `Podfile` for CocoaPods projects
- `build.gradle` / `build.gradle.kts` for Android Gradle projects
- `gradle/libs.versions.toml` for Android Version Catalog projects
- `pubspec.yaml` for Flutter and Dart projects
- `go.mod` for Go modules
- `Cargo.toml` for Rust / Cargo projects
- `Gemfile` for Ruby / Bundler projects

### Ecosystem support details

For Composer projects:

- Fetches the latest stable version of each package from [Packagist](https://packagist.org)
- Skips platform requirements (`php`, `ext-*`, `lib-*`) — only real packages are checked
- Preserves your version constraint prefix on update (`^`, `~`, `>=`, etc.)
- Detects `composer.lock` status and offers a one-click `composer install`

For Apple projects:

- Reads dependencies from `Package.swift` and `Podfile`
- Resolves Swift package updates from GitHub releases and tags
- Resolves CocoaPods updates from CocoaPods trunk metadata
- Detects `Package.resolved` / `Podfile.lock` drift and offers sync actions

For Android projects:

- Reads direct dependencies from `build.gradle` / `build.gradle.kts`
- Reads library entries from `gradle/libs.versions.toml`
- Resolves artifact versions from Google Maven and Maven Central
- Detects Gradle lockfile drift where lock files are present

For Flutter projects:

- Reads `dependencies` and `dev_dependencies` from `pubspec.yaml`
- Resolves latest stable releases from [pub.dev](https://pub.dev)
- Detects `pubspec.lock` drift and offers a one-click `flutter pub get`

For Go, Rust, and Ruby projects:

- Reads dependencies from `go.mod`, `Cargo.toml`, and `Gemfile`
- Resolves latest versions from the Go proxy, crates.io, and RubyGems
- Detects `go.sum`, `Cargo.lock`, and `Gemfile.lock` drift
- Offers one-click sync flows with `go mod tidy`, `cargo check`, and `bundle install`

## Contributing

Install the dependencies...

```bash
npm install
```

...then start

```bash
npm run dev
```

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request to the project.

## Community support

For additional help, you can use one of these channels to ask a question:

- [GitHub](https://github.com/mehdiraized/npmax) (Bug reports, Contributions)
- [Twitter](https://twitter.com/npMax_app) (Get the news fast)
- [Telegram](https://t.me/npmax_app)

## Building and running in production mode

To create an optimized version of the app:

```bash
npm run dist
```
