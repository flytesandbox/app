import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(60,39,18,0.09)] md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            Base App For UI/UX Review
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl leading-tight md:text-6xl">
              A cleaner front door for the next MEC Plans application cycle.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[color:var(--muted)] md:text-lg">
              Phase 9 moves the project from an identity shell into a real base
              application: a public entry experience, a signed-in application
              workspace, and an internal review queue that can be pushed to
              staging for real UX evaluation.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white shadow-[0_14px_36px_rgba(127,50,21,0.18)]">
                  Enter the workspace
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard/application"
                prefetch={false}
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white shadow-[0_14px_36px_rgba(127,50,21,0.18)]"
              >
                Open my application
              </Link>

              <div className="flex items-center gap-3 rounded-full border border-black/10 bg-white/70 px-4 py-2">
                <UserButton />
                <span className="text-sm text-[color:var(--muted)]">
                  Signed-in preview
                </span>
              </div>
            </Show>

            <Link
              href="/dashboard"
              className="rounded-full border border-black/10 bg-white/70 px-5 py-3 font-semibold"
            >
              View dashboard
            </Link>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_18px_50px_rgba(60,39,18,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              What is in scope now
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--foreground)]">
              <li>Public-facing landing and application start surface</li>
              <li>Tenant application draft and review flow</li>
              <li>Internal queue visibility for review staff</li>
              <li>Existing release and health visibility from Phase 8</li>
            </ul>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(43,35,27,0.95)] p-6 text-white shadow-[0_18px_50px_rgba(43,35,27,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Review lens
            </p>
            <p className="mt-4 text-lg leading-7">
              Staging is now meant to answer UX questions, not just deploy
              questions.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Reviewers should be able to judge the clarity of the landing
              page, the dashboard, the draft workflow, and the internal queue
              without falling back to phase-only proof screens.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            eyebrow: 'Public',
            title: 'Intentional first impression',
            copy:
              'The base app now introduces the experience directly instead of exposing a raw phase shell.',
          },
          {
            eyebrow: 'Tenant',
            title: 'A real draft workflow',
            copy:
              'Signed-in tenant users can shape a draft application, review it, and prepare it for internal handoff.',
          },
          {
            eyebrow: 'Internal',
            title: 'Review queue posture',
            copy:
              'Operations and reviewers can see recent applications and move them through a clearer status path.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {item.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {item.copy}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
