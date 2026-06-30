# Qaza Namaz Tracker

A small, good-looking PWA to track and clear your missed (**qaza**) prayers —
Fajr, Zuhr, Asr, Maghrib, Isha. Tap **+** when you miss a prayer, **−** when you
make one up, or tap the number to set an exact backlog. Works offline and
installs to your iOS/Android home screen.

- **Offline-first** — every change is saved to `localStorage` instantly, so your
  counts survive restarts even with no internet and no account.
- **Optional cloud sync** — add Supabase keys to sync across devices via a
  passwordless email magic link.
- **Light blue / white theme**, fully responsive (mobile + desktop), installable
  as a PWA.

## Tech

Vite · React + TypeScript · `vite-plugin-pwa` · Supabase (optional).

## Run it

```bash
npm install
npm run icons   # generate PWA/Apple icons (one-time, re-run if you change the design)
npm run dev     # http://localhost:5173
```

Build for production / preview:

```bash
npm run build
npm run preview
```

The app is fully usable with **no configuration** — it just stays on one device.

## Enable cross-device sync (Supabase)

Login is **phone number + password** (register + log in), so more than one person
can each keep their own counts. To avoid paid SMS, the phone number is used as a
username mapped to an internal id — no codes are texted.

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql),
   and **Run**.
3. **Authentication → Sign In / Providers → Email**: make sure the Email provider
   is enabled and turn **"Confirm email" OFF**. (Required — accounts use a
   synthetic email that can't receive a confirmation link.)
4. **Project Settings → API**: copy the **Project URL** and the **anon / public**
   key into `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart `npm run dev`. A control appears top-right — open it to **Register**,
   then **Log in** with your phone number + password on any device. Counts sync
   (last write wins).

> No "forgot password" email is possible (the email is synthetic). Reset a
> password from **Authentication → Users** in the Supabase dashboard if needed.
> For personal use the free tier is far more than enough.

## How sync works

`localStorage` is always the immediate source of truth. When signed in, the app
pulls your cloud row on login and reconciles by `updated_at` (newest wins), then
pushes local edits up (debounced). If Supabase is unreachable, the app keeps
working locally and resumes syncing when it can.

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Build
with `npm run build` and serve the `dist/` folder. Set the two `VITE_SUPABASE_*`
env vars in your host's dashboard if you want sync in production, and add the
deployed URL to Supabase's redirect allow-list.
