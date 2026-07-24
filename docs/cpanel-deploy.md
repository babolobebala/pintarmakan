# cPanel Deployment via GitHub Actions

This project can be deployed to cPanel by building in GitHub Actions and uploading the production bundle to the cPanel Node.js application root over FTP.

## Requirements

- cPanel must provide a Passenger-based Node app manager such as `Setup Node.js App` or `Application Manager`.
- The server must provide Node `22.19.0` or newer for this app.
- The cPanel app must use `app.cjs` as the startup file.
- The remote application root must already exist in cPanel before the first deploy.

## One-time cPanel setup

1. Create a subdomain such as `app.example.com`.
2. Open `Setup Node.js App` or `Application Manager`.
3. Create the Node app with:
   - Node version: `22` or newer
   - Mode: `production`
   - Application root: for example `apps/dashboard-template`
   - Application URL: `/` if you use a dedicated subdomain
   - Startup file: `app.cjs`
4. Save the app once so cPanel creates the app root.

The GitHub Actions workflow deploys into the application root from step 3.

## GitHub repository secrets

Add these repository secrets:

- `FTP_SERVER`: your FTP host
- `FTP_USERNAME`: your FTP username
- `FTP_PASSWORD`: your FTP password
- `FTP_PORT`: usually `21`
- `FTP_SERVER_DIR`: remote application root directory, for example `/apps/dashboard-template`

## Workflow behavior

The deploy workflow:

1. installs dependencies with `pnpm`
2. runs `pnpm run lint`
3. builds Nuxt with the Node server preset
4. prepares a release directory with `.output`, `app.cjs`, `package.json`, `DEPLOY_COMMIT`, and `tmp/restart.txt`
5. uploads that directory to the cPanel app root over FTP
6. replaces the remote app root contents
7. updates `tmp/restart.txt` so Passenger reloads the app

## Triggering deployment

The workflow file is `.github/workflows/deploy-cpanel.yml`.

It runs on:

- pushes to `main`
- manual `workflow_dispatch`

If your deployment branch is not `main`, update the workflow trigger.

## Notes

- This deploy path does not upload `node_modules`.
- This deploy path does not require `npm install` on the server.
- The startup wrapper `app.cjs` exists because some cPanel and CloudLinux Passenger setups are stricter with ESM entrypoints.
- The workflow uses a full mirror deploy. Keep `FTP_SERVER_DIR` dedicated to this app only.
- If you deploy under a subfolder instead of a subdomain, set `NUXT_APP_BASE_URL` in the cPanel app environment and rebuild through GitHub Actions.
