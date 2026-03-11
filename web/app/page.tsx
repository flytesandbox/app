import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Phase 4 Identity Shell</h1>

      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded border px-4 py-2">Sign in</button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <div className="flex items-center gap-4">
          <UserButton />
          <Link
            href="/dashboard"
            prefetch={false}
            className="rounded border px-4 py-2"
          >
            Go to dashboard
          </Link>
        </div>
      </Show>
    </main>
  )
}