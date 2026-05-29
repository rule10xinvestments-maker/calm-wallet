# Calm Ledger PWA Install QA

Calm Ledger exposes install metadata through the Next.js App Router manifest at `/manifest.webmanifest`.

Quick checks:

- Run `npm.cmd run build` to confirm the manifest and metadata compile.
- Start the app locally and open Chrome DevTools, then check Application > Manifest.
- Confirm the app name is `Calm Ledger`, `start_url` is `/assistant`, display mode is `standalone`, and install icons are present.
- On mobile, use the browser install/add-to-home-screen flow. If icons or manifest values changed since a prior install, uninstall and reinstall the app to refresh cached install metadata.

This patch intentionally does not add a service worker or offline-first caching, so installed screens should continue to load fresh network/app responses.
