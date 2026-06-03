# Calm Ledger PWA Install QA

Calm Ledger exposes install metadata through the Next.js App Router manifest at `/manifest.webmanifest`.

Quick checks:

- Run `npm.cmd run build` to confirm the manifest and metadata compile.
- Start the app locally and open Chrome DevTools, then check Application > Manifest.
- Confirm the app name is `Calm Ledger`, manifest `id` is `/`, `start_url` is `/assistant`, display mode is `standalone`, and install icons are present.
- On mobile, use the browser install/add-to-home-screen flow. If icons or manifest values changed since a prior install, uninstall and reinstall the app to refresh cached install metadata.
- In Chrome for Android, clear Calm Ledger site data and remove any installed Calm Ledger icon before re-testing install prompts so stale manifest or WebAPK metadata is not reused.
- If an installed PWA shows a server digest or chunk-loading error after deploy, remove the installed icon and clear Chrome site data before reinstalling so old cached shell metadata cannot request retired deployed chunks.

This patch intentionally does not add a service worker or offline-first caching, so installed screens should continue to load fresh network/app responses.
