# cPanel Deployment via GitHub Actions

This project can be deployed to cPanel by building in GitHub Actions, uploading a release archive over SSH, and extracting it inside the cPanel Node.js application root.

## Requirements

- cPanel must provide a Passenger-based Node app manager such as `Setup Node.js App` or `Application Manager`.
- The server must provide Node `24.18.0` or newer for this app.
- SSH access must be enabled for the cPanel user.
- The cPanel app must use `app.cjs` as the startup file.
- The remote application root must already exist in cPanel before the first deploy.

## One-time cPanel setup

1. Create a subdomain such as `app.example.com`.
2. Open `Setup Node.js App` or `Application Manager`.
3. Create the Node app with:
   - Node version: `24.18.0` or newer
   - Mode: `production`
   - Application root: for example `apps/dashboard-template`
   - Application URL: `/` if you use a dedicated subdomain
   - Startup file: `app.cjs`
4. Save the app once so cPanel creates the app root.

The GitHub Actions workflow deploys into the application root from step 3.

## GitHub repository secrets

Add these repository secrets:

- `SSH_HOST`: your SSH host
- `SSH_USERNAME`: your cPanel username
- `SSH_PORT`: usually `22`
- `SSH_PRIVATE_KEY`: the private key for your authorized SSH key
- `APP_PATH`: absolute application root path, for example `/home/youruser/apps/dashboard-template`

## Workflow behavior

The deploy workflow:

1. installs dependencies with `pnpm`
2. runs `pnpm run lint`
3. builds Nuxt with the Node server preset
4. prepares a release archive with `.output`, `app.cjs`, `package.json`, and `DEPLOY_COMMIT`
5. uploads the archive over SSH
6. extracts it into the app root on the server
7. replaces the old `.output`
8. updates `tmp/restart.txt` so Passenger reloads the app

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
- The workflow uploads a single archive, which is much faster than FTP for Nuxt server builds.
- If you deploy under a subfolder instead of a subdomain, set `NUXT_APP_BASE_URL` in the cPanel app environment and rebuild through GitHub Actions.
