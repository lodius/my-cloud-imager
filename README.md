This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Lumen

Lumen is a private, self-hosted photo library designed to run on a Raspberry Pi and be reached through an existing Tailscale network.

## Current slice

- Responsive Google Photos-style library view
- Search by photo title and location
- Albums view with sample collections
- Local file picker with an upload-ready status state
- Storage indicator and private Tailscale account treatment

The gallery uses sample records and remote image placeholders for the browsing view. Uploaded files now persist to `data/photos` locally, or to the directory specified by `MEDIA_ROOT`. The next backend slice should index metadata in SQLite, serve thumbnails, and add authentication.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Before deploying to the Pi, run:

```bash
npm run lint
npm run build
npm start
```

## Raspberry Pi deployment direction

1. Install a current Node.js LTS release on the Pi.
2. Clone this project onto the Pi and run `npm ci`.
3. Set the future media root to a durable mounted disk, for example `/mnt/photos` rather than the project directory.
4. Run the production server on an internal port such as `3000`.
5. Access it using the Pi's Tailscale hostname or IP. Keep the service bound to the Tailscale/private interface and do not expose the media directory directly.

Authentication, durable uploads, thumbnail generation, SQLite indexing, backups, and a systemd service are intentionally the next implementation steps before storing irreplaceable photos.
