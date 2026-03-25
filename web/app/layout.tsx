import Link from 'next/link'
import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from '@clerk/nextjs'

import './globals.css'

export const metadata = {
  title: 'MEC Plans Base App',
  description: 'MEC Plans application workspace and review experience.',
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-[rgba(255,250,244,0.88)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="space-y-1">
          <Link href="/" className="text-lg font-semibold tracking-[0.08em] uppercase text-[color:var(--accent-strong)]">
            MEC Plans
          </Link>
          <p className="text-sm text-[color:var(--muted)]">
            Application workspace
          </p>
        </div>

        <nav className="hidden items-center gap-3 text-sm md:flex">
          <Link href="/" className="rounded-full border border-black/10 bg-white/70 px-4 py-2">
            Overview
          </Link>
          <Link href="/dashboard" className="rounded-full border border-black/10 bg-white/70 px-4 py-2">
            Workspace
          </Link>
          <Link href="/release" className="rounded-full border border-black/10 bg-white/70 px-4 py-2">
            Release Status
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <Link href="/sign-up" className="hidden rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm md:inline-flex">
              Create account
            </Link>

            <SignInButton mode="modal">
              <button className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(127,50,21,0.18)]">
                Sign in
              </button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard/application" className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm">
              Application
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AppHeader />
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  )
}
