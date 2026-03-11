# npMax

![screenshot-npMax-package-manager](https://mehdiraized.github.io/npmax/dist/images/coverApp.png)

The Open Source desktop GUI for npm, yarn, pnpm, and **Composer** packages.

Runs on Linux, macOS and Windows.

## Download npMax v2.7.1

### macOS
**[Download for macOS Apple Silicon (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax-2.7.1-arm64.dmg)**

**[Download for macOS Intel (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax-2.7.1.dmg)**

### Windows
**[Download Installer for Windows](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax.Setup.2.7.1.exe)**

**[Download Portable for Windows](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax.2.7.1.exe)**

### Linux
**[Download AppImage (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax-2.7.1.AppImage)**

**[Download AppImage (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npMax-2.7.1-arm64.AppImage)**

**[Download .deb (x64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npmax_2.7.1_amd64.deb)**

**[Download .deb (arm64)](https://github.com/mehdiraized/npmax/releases/download/v2.7.1/npmax_2.7.1_arm64.deb)**

[All Releases](https://github.com/mehdiraized/npmax/releases/)

## Features

- View and manage **npm**, **yarn**, and **pnpm** packages from a `package.json`
- View and manage **Composer** (PHP) packages from a `composer.json`
- Detect outdated packages with live version checks against the npm registry and Packagist
- One-click version updates with semver prefix preservation (`^`, `~`, etc.)
- Lock file status indicator with Install / Sync button
- Supports multiple projects in a sidebar
- Cross-platform: macOS, Linux, Windows

### Composer support

npMax automatically detects whether your project uses `composer.json` (PHP/Composer) or `package.json` (Node.js) and displays the appropriate editor. For Composer projects:

- Fetches the latest stable version of each package from [Packagist](https://packagist.org)
- Skips platform requirements (`php`, `ext-*`, `lib-*`) — only real packages are checked
- Preserves your version constraint prefix on update (`^`, `~`, `>=`, etc.)
- Detects `composer.lock` status and offers a one-click `composer install`

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
