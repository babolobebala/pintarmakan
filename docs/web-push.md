# Web Push

This project uses standard Web Push with VAPID keys and the existing `@vite-pwa/nuxt` service worker.

## Generate VAPID keys

Run:

```bash
pnpm exec web-push generate-vapid-keys
```

Then set:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Use a `mailto:` or `https:` subject value, for example `mailto:admin@example.com`.
