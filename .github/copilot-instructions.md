# Lumen project notes

- Keep photo files outside the repository when deploying to a Raspberry Pi; use `MEDIA_ROOT` for the durable mount.
- Preserve the private-by-default assumption: the app is reached through Tailscale and should not expose the media directory directly.
- Run `npm run lint` and `npm run build` before shipping changes.
