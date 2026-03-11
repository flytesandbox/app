import Link from 'next/link'
import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from '@clerk/nextjs'

import './globals.css'

export const metadata = {
  title: 'App',
  description: 'Phase 5 authorization shell',
}

function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          App
        </Link>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded border px-4 py-2">Sign in</button>
            </SignInButton>

            <Link href="/sign-up" className="rounded border px-4 py-2">
              Sign up
            </Link>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard" className="rounded border px-4 py-2">
              Dashboard
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}