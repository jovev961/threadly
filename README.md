# Threadly

## Development dummy data

With dependencies installed and `MONGODB_URL` configured in `.env.local`, run:

```bash
npm run seed
```

This creates **100 fictional accounts** in **`threadly_seed_dev`**, on the same
MongoDB host/cluster as your configured connection. It does **not** populate your
normal database or change `.env.local`. The MongoDB account must have access to
the separate database. Seed tools refuse `NODE_ENV=production`.

Each account has a profile and portrait, 3–20 posts, and varying activity levels.
The dataset includes links, post galleries, follows, likes, one-level comment
replies, reposts, and share counters. Passwords pass through the User model's
existing bcrypt save hook. Sample portraits come from
[Random User](https://randomuser.me/documentation) and post photos from
[Lorem Picsum](https://picsum.photos/); these are fictional identities, not the
people depicted. Failed downloads use generated JPEG placeholders. Downloads
are cached in memory for each run, normalized, and saved as local uploads.

### Sign in and browse

All account credentials are in **`.local/seed/credentials.txt`**, formatted as:

```text
Username: ...
Email: ...
Password: ...
```

Blocks are separated by a blank line. The accounts share a randomly generated,
development-only password. The directory is private (0700), the TXT is 0600,
and local seed state is gitignored. Never commit or deploy credentials or use
these accounts in production. Runtime upload subdirectories are also gitignored;
the shared default-avatar asset remains trackable.

Stop any existing Next development server for this checkout, then run:

```bash
npm run dev:seed
```

This starts the unchanged app with only its database connection overridden.
Use an account from the credentials file. Normal `npm run dev` still uses your
normal database. The seed server holds a local operation lock to prevent cleanup
while it is running; stop it before verification or cleanup. Do not run another
server or writer against the seed database during cleanup.

### Verify and remove

```bash
npm run seed:verify
npm run seed:clean -- --dry-run
npm run seed:clean
```

Verification checks counts, uniqueness, references, password hashes, timestamps,
reply depth, photo ownership/limits/checksums, credentials, and activity spread.
Rerunning `seed` verifies an existing completed dataset instead of duplicating it.

Ownership is recorded by exact IDs in `development_seed_runs`, with a local
manifest mirror. Cleanup never drops a database, matches by username prefix,
or invokes the broader account-deletion API. It checks **all conflicts before
deleting anything**, including nonseed follows/comments/replies and other
dependencies, changed photo files, unexpected files, and symlinks. Conflicts
stop cleanup and list the affected IDs/paths for manual review. Do not delete
real data just to make cleanup pass; preserve or deliberately relocate it first.

Successful cleanup permanently removes only manifest-owned documents/photos,
the generated credentials, and the local manifest; it leaves unrelated records
and the default avatar intact. Empty generated directories are removed without
recursive deletion. An interrupted run retains its manifest: inspect the failure,
then run cleanup before reseeding. Cleanup tolerates already-missing owned files
and documents. A stale local lock is reclaimed only if its process no longer
exists. Keep the database manifest until cleanup has finished.

### Tests

```bash
npm run seed:test
SEED_INTEGRATION=1 npm run seed:test
```

The default tests are offline. The opt-in integration test uses only
`threadly_seed_test` and a temporary photo directory. It exercises the full seed,
idempotency, cleanup blockers, interrupted cleanup, and unrelated-data preservation.
It requires access to that separate database and never drops it. A preexisting
test manifest stops the test for manual inspection.

Manually check login, Discover/Home, profiles/reposts, comment threads, and
mixed-aspect-ratio photo galleries using `dev:seed`.

---

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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
