# Staging Clerk Recovery

Use this guide when a staging deploy fails with a Clerk message like:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_`

What that means:

- staging is not receiving a real Clerk publishable key
- the app code is not the main problem here
- the staging Clerk setup or the GitHub staging secrets are wrong or incomplete

Common causes:

- the staging Clerk app was never created
- a local or production Clerk key was pasted into staging
- the value was pasted with quotes around it
- a placeholder value was pasted instead of a real Clerk key

## People needed

- someone who can open the Clerk dashboard for this project
- someone who can edit the GitHub `staging` environment secrets and variables

## Staging values this app expects

- `NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com`
- `CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`

## Step 1 - Fix Clerk first

1. Sign in to Clerk.
2. Open the staging Clerk application for this project.
3. If there is no separate staging Clerk application yet, create one for staging only.
4. Make sure the staging Clerk application is configured for `staging.mecplans101.com`.
5. If Clerk asks for allowed origins, redirect URLs, or domains, use the staging site and staging paths only. Do not use localhost and do not use the production domain.

## Step 2 - Copy the three Clerk values

From the staging Clerk application, copy these exact values:

- publishable key
- secret key
- JWT public key

Expected formats:

- publishable key starts with `pk_test_` or `pk_live_`
- secret key starts with `sk_test_` or `sk_live_`
- JWT public key contains `BEGIN PUBLIC KEY`

Important:

- paste the values exactly as Clerk shows them
- do not add quotes
- do not add extra spaces
- do not reuse local or production keys in staging
- the publishable key and secret key must both be test keys or both be live keys

## Step 3 - Update GitHub staging settings

In GitHub, open:

- repository `Settings`
- `Environments`
- `staging`

Update these secrets:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = staging Clerk publishable key
- `CLERK_SECRET_KEY` = staging Clerk secret key
- `CLERK_JWT_KEY` = full staging Clerk JWT public key

Confirm these variables:

- `NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com`
- `CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`

## Step 4 - Run staging deploy again

1. Re-run the staging deploy after the corrected repo changes are pushed.
2. Watch the workflow from the start.
3. If it now fails before build or deploy, read the named setting in the failure and fix that exact value in GitHub or Clerk.

## Step 5 - Confirm the fix worked

Expected results:

- the workflow passes the Clerk validation step
- the staging container becomes healthy
- opening staging while signed out loads the site
- opening a protected page redirects to Clerk sign-in
- signing in returns the user to `/dashboard`

## If it still fails

Check these first:

- the key was pasted without quotes
- the key came from the staging Clerk app, not local and not production
- the publishable key and secret key are from the same Clerk app
- `CLERK_AUTHORIZED_PARTIES` still matches `https://staging.mecplans101.com`
- the JWT key is the full public key block, not a partial copy
