# Cloudflare deployment

This repository is ready to import as a Cloudflare Worker with static assets. The checked-in `dist/` directory contains the website; the build command validates it. `worker/index.mjs` protects every page and asset with HTTP Basic authentication, following qpadel's approach.

## Import from GitHub

1. In Cloudflare, open **Workers & Pages → Create application → Import a repository** and select `mfaarabi/sadabot`.
2. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Worker name | `kost-rapi` |
   | Production branch | `master` |
   | Root directory | `/` |
   | Build command | `npm run build` |
   | Deploy command | `npm run deploy` |

3. Deploy. Before credentials are configured, all requests return HTTP 503, so assets remain inaccessible.
4. Open the new Worker's **Settings → Variables and Secrets**. Add two runtime bindings of type **Secret**: `DEMO_USERNAME` and `DEMO_PASSWORD`. Use the same values as qpadel's existing `court-care` Worker. Save and deploy the settings. These are Worker runtime secrets, not build environment variables.
5. Visit the production URL shown by Cloudflare. The browser should ask for qpadel's existing login. After signing in, `/` opens the landing page and `/app` opens the manager.

Credential values belong only in Cloudflare, never in GitHub. Wrangler deliberately does not declare required secrets so the initial GitHub import can deploy before runtime secrets exist; the Worker itself fails closed when either is missing. Later code deployments retain the runtime secrets.

`wrangler.jsonc` serves `dist/` through the `ASSETS` binding and runs authentication before asset delivery (`run_worker_first: true`). Cloudflare's `drop-trailing-slash` HTML handling serves clean URLs: `/`, `/app`, `/brief`, and `/requirements`. Existing `.html` links redirect to their clean equivalents. Preview URLs are disabled. Production pushes to `master` can be rebuilt by the GitHub connection created during import.

## Local checks and gated preview

Requires Node.js 22.12 or later.

```sh
npm ci
npm run build
npm run deploy:dry-run
```

For a local preview with the login gate and Cloudflare routing, create an ignored `.dev.vars` file containing `DEMO_USERNAME` and `DEMO_PASSWORD`, then run `npm run preview` and open `http://127.0.0.1:4174/app`. `make dev` remains the simple Python preview without authentication, using `/app.html`.

The login gate limits site access. App data still lives in each browser's localStorage; this deployment does not add shared persistence or user accounts.
