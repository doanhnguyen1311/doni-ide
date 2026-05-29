# Doni IDE

Doni IDE is an Electron desktop app built with Vite, React, and TypeScript. It acts as a local AI coding companion for opening a project folder, asking quick questions, planning work, generating patch previews, applying patches, and keeping per-project chat history.

## Requirements

- Node.js 22+
- npm
- Windows is the current primary packaging target

## Development

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev
```

`npm run dev` starts Vite, TypeScript watch for Electron, and Electron.

## Build

Build the renderer/main process and package the Windows installer:

```bash
npm run build
```

This creates installer artifacts in `release/`:

- `Doni-Setup-<version>.exe`
- `Doni-Setup-<version>.exe.blockmap`
- `latest.yml`

Build only the app output without packaging:

```bash
npm run build:app
```

`npm run package` is an alias for `npm run build`.

## Data Storage

Global Doni data is stored in:

```text
~/.doni
```

On Windows this resolves to:

```text
C:\Users\<user>\.doni
```

Global files include:

- `~/.doni/settings/ai-settings.json`
- `~/.doni/settings/anti-providers.json`
- `~/.doni/app-state.json`
- `~/.doni/patch-backups/`
- `~/.doni/auth/`
- `~/.doni/cache/`
- `~/.doni/logs/`

Per-project session history is stored in the opened project:

```text
<project>/.doni/sessions/sessions.json
```

The app restores the last opened project folder on startup when the folder still exists.

## Settings

Settings are auto-saved after edits. The Settings screen includes:

- AI API base URL and key
- Planner model
- Executor model
- Executor provider
- Context file limits
- Ignore patterns
- Diff mode
- Codex sandbox mode
- App update controls
- Provider import/apply controls

## Provider Import

Settings can import a JSON file containing provider account data.

The importer currently reads:

```ts
providerConnections[]
```

It filters accounts by provider:

```ts
provider === "codex"
```

It maps each matching item into:

- `account`: from `email`, fallback `name`
- `accessToken`: from `accessToken`
- `refreshToken`: from `refreshToken`
- `chatgptAccountId`: from `account_id`, `accountId`, `chatgptAccountId`, `providerSpecificData.chatgptAccountId`, or `providerSpecificData.accountId`

Imported accounts are saved to:

```text
~/.doni/settings/anti-providers.json
```

Clicking `OK` on an imported account writes the active credentials to:

```text
~/.mani/auth.json
```

The active account id is saved as `selectedProviderId`, so Settings can show which account is currently selected next time.

## Auto Update

The app uses `electron-updater` with `electron-builder`.

Important behavior:

- On startup, the app checks for updates silently.
- It does not auto-download updates.
- It does not auto-install updates.
- Updates are only downloaded and installed from Settings after user confirmation.

Updater IPC channels:

- `updater:status`
- `updater:check`
- `updater:download`
- `updater:install`
- `updater:progress`

Renderer API:

```ts
window.electron.updater.check()
window.electron.updater.download()
window.electron.updater.install()
window.electron.updater.onStatus(callback)
window.electron.updater.onProgress(callback)
```

## GitHub Release

Releases are published through GitHub Actions when pushing a tag matching:

```bash
v*
```

Release workflow:

```text
.github/workflows/release.yml
```

Create a release:

```bash
npm version patch
git push origin main
git push origin v<version>
```

The workflow builds the Windows NSIS installer and uploads release assets using GitHub's token.

## Notes

Chromium may print cache or DevTools warnings in development, such as GPU cache or Autofill protocol messages. These are not usually app-breaking errors.

Run this before committing major changes:

```bash
npm run build:app
```
