App Rebuile Synopsis

See project sources: app-main (1).zip. This is as far as I got with this application and could not get it to push to the staging server at staging.mecplans101.com. I am going to rebuild this app from the ground up but need step by step instructions. The goal is to use 1 chat per phase until the app is deployed. 

I am using Codex, Github, Linode, Clerk(free version), wnscp, vsc.

Read the dev-process.txt source as wel. 

Generate a synopsis of my goals and generate it in this chat. I will add this response to the Sources as an additional source of truth for this project. 

I’m pulling two things together: your explicit project intent from dev-process.txt and the current app state from the zip so the synopsis reflects both the build goal and where the breakdown happened.

The zip is useful. It is not just source code — it already includes architecture, readiness, and DevOps planning docs. I’m checking those against the workflow files to separate your intended build model from the exact point staging broke.

Thought for 2m 23s

I reviewed dev-process.txt and inspected the app-main (1).zip repo. This synopsis is meant to be saved as a source-of-truth project brief for the rebuild. It is anchored to the build order and control model defined in your dev-process document.

Project Synopsis — app rebuild for staged enterprise deployment
Core objective

Rebuild the application from the ground up using a phased, controlled development process so the app can move cleanly from local development to staging at staging.mecplans101.com, then to production, without repeating the same deployment and environment mistakes that blocked the current version.

This is not just an “app build.” It is an enterprise-style application system that must be designed in the right order: controls and architecture first, then environments, then identity/secrets/network, then data, then application skeleton, then CI/CD, then observability, then feature work, then release gates.

What this project is trying to become

The application is an ICHRA setup platform with two main experiences:

A public-facing application flow where an employer can complete a multi-step ICHRA setup form, save progress, resume later, upload required files, and submit the application.

An internal/admin experience where authorized internal users can review submitted applications, inspect details, and process them safely.

The broader goal is to build this in a way that is deployable, supportable, and scalable inside a HIPAA/SOC2-minded operating model rather than as a fragile feature-first app. The dev-process document is explicit that the target model should be enterprise-grade but not overbuilt: GitHub for source control and CI, local development, staging as a production-like validation environment, production isolated from staging, Traefik as edge ingress, Clerk for auth, Node/Python services behind the edge layer, private data tiers, centralized secrets, structured logs, backups, and release gates.

Current-state read on the existing repo

The current repo is not a blank start. It already contains meaningful work:

It has a monorepo-style layout with web, api, worker, infra, docs, scripts, and GitHub workflows.

It already includes documented architecture, DevOps planning, secrets contracts, infrastructure topology, release/rollback docs, and compliance-readiness notes.

It already contains an implemented ICHRA application path with a public setup wizard, draft save/resume behavior, uploads, review-before-submit behavior, and an admin review path.

It already has deployment workflows for dev/staging/prod promotion patterns, smoke checks, image-based deploy flow, and rollback mechanics.

It also already has auth-related prep work for Clerk integration, but the current repo is still materially shaped around a prior architecture pattern: Node API, Nginx web container, Postgres-backed persistence, and OIDC-style token validation.

Why a rebuild is the right move

The problem is not that the current repo has no value. The problem is that it appears to be a partially-built system with mixed assumptions:

The existing app/repo direction is centered on one stack and one deployment contract.

Your rebuild target is different: Codex-assisted development, GitHub-driven CI/CD, Linode hosting, Clerk free tier for auth, VSC as the development surface, WinSCP for server visibility/access, and a cleaner step-by-step build process that you can actually operate.

In plain terms: the repo contains useful lessons, patterns, and scaffolding, but it is not yet a clean owner-operated system. Rebuilding lets you lock the operating model first and then add features in the right order.

That aligns directly with the dev-process warning that the wrong mental model is “build features first, then fix deploy/security/config later,” while the correct model is “an enterprise app is a controlled system, and features are one layer inside that system.”

What the rebuild must optimize for

This rebuild should optimize for six things:

Phase clarity
One chat per phase until deployment. Each chat should have one job, one exit criterion, and one source-of-truth output.
Owner-operability
The system must be understandable and runnable by you, not just technically possible for an experienced engineer.
Staging-first deployment discipline
Staging must behave like production, not like a second dev box. Same deployment method, same variable pattern, same container shape, same auth callback shape, same migration process.
Fail-closed configuration
Secrets, environment variables, host trust, auth config, and database config must be validated early so deploy failures happen before release, not after.
Auth and authorization separation
Clerk should handle authentication. The app/backend must still enforce authorization, tenant boundaries, role permissions, and action-level checks.
Deployment trustworthiness
CI must promote the same artifact across environments, run migrations as a first-class release step, and require staging validation before production.
Rebuild target stack and operating model
Build/operator toolset
Codex
GitHub
Linode
Clerk (free version)
WinSCP
VS Code
Intended runtime direction
Edge routing and TLS through Traefik
Separate local, staging, and production environments
Private database posture
CI/CD from GitHub
Controlled secrets and deploy credentials per environment
Role-aware app behavior and admin-only review paths
Logging, smoke checks, and rollback capability before production use
Most important lesson from the failed attempt

The previous effort got far enough to build meaningful app behavior, but the system still broke at deployment/staging readiness.

So the rebuild is not mainly about “making the app prettier” or “rewriting code cleaner.”

It is about moving the project from feature accumulation to controlled delivery.

Per the dev-process, secrets/config handling is a recurring pain point and must be treated as a formal contract: secrets are never hardcoded, never casually copied between environments, and staging/prod should pull from managed environment secrets with startup validation.

Official working method for this rebuild

This project will be rebuilt phase-by-phase, using one chat per phase, until the app is fully deployed.

Each phase chat should produce:

the goal of that phase
the exact deliverables
the source-of-truth decisions for that phase
the pass/fail exit criteria
the next phase handoff
Recommended phase sequence for this project

This should follow the same sequence established in the dev-process:

Phase 1 — System map

Define users, roles, tenants, services, databases, third parties, regulated data, and boundaries.

Phase 2 — Environment map

Define local, staging, and production; hostnames; DNS; deploy paths; secret sources; and environment separation.

Phase 3 — Platform controls

Set up Linode/server hardening, private networking, Traefik, TLS, logging, backups, and secret handling.

Phase 4 — Identity shell

Integrate Clerk at the shell level: sign-in/out flow, session validation, protected routes, allowed origins, and backend token verification.

Phase 5 — Authorization and tenant rules

Define roles, permission matrix, backend guards, and tenant/resource isolation.

Phase 6 — Database architecture

Lock schema strategy, migration flow, seed approach, service credentials, backup, and restore process.

Phase 7 — CI/CD pipeline

Set up PR checks, build artifacts, registry flow, staging deploy, smoke tests, and promotion rules.

Phase 8 — Observability and auditability

Add logs, metrics, traces, audit events, correlation IDs, and release visibility.

Phase 9 — Feature rebuild

Rebuild the ICHRA application features inside the now-stable system.

Phase 10 — Release gates and deployment

Require staging success, secret resolution, auth validation, migration validation, TLS, rollback readiness, and deployment only through CI.

Definition of success

This rebuild is successful when all of the following are true:

The app can be developed locally with fake/test-safe data.

The app can be pushed to staging through GitHub Actions without manual server-side patching.

Staging mirrors production closely enough to validate real deployment behavior.

Clerk authentication works end-to-end.

Authorization is enforced in the backend, not just the UI.

Database migrations run cleanly and predictably.

Secrets are environment-specific and validated before deploy.

The system exposes health/readiness and deployment visibility.

Staging can be promoted using controlled release rules.

Production deployment becomes a promotion decision, not a custom rebuild.

Final source-of-truth summary

This project is an ICHRA setup application rebuild intended to move from a partially working but operationally fragile codebase into a clean, phase-driven, enterprise-style delivery system.

The rebuild will prioritize environment design, auth boundaries, deployment discipline, and secrets/config correctness before deep feature work.

The app will be rebuilt using Codex, GitHub, Linode, Clerk, WinSCP, and VS Code, with one chat per phase until deployment is complete.

The standard for the rebuild is not “working code in a repo.” The standard is a controlled system that can be built, validated, deployed to staging, promoted safely, and operated without guesswork.

When you start the next chat, the right first phase is the system map + environment map, not feature rebuilding.