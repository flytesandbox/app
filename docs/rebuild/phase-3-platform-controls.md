# Phase 3 — Platform Controls

## Goal
Prepare the staging environment to act like a production-grade shell before application/auth/database work.

## Locked decisions
- Traefik is the only public ingress.
- Only ports 22, 80, and 443 are exposed publicly.
- No database port is exposed publicly.
- Docker Engine and Docker Compose plugin are installed on the staging host.
- Secrets are not committed to git.
- GitHub environment secrets are used for deploy transport secrets.
- Staging keeps logs and config backups.
- Traefik dashboard is protected by auth and IP allowlist.
- Staging is the first environment built; production will mirror this structure later.

## Deliverables
- Hardened staging Linode
- Docker Engine installed
- Docker Compose plugin installed
- UFW active
- Traefik running
- TLS working
- Access logs enabled
- Linode Backups enabled
- Config backup script installed
- GitHub staging transport secrets recorded

## Exit criteria
- SSH works with deploy user key
- `ufw status` shows 22, 80, 443 allowed
- `docker ps` works
- `docker compose version` works
- Traefik container is healthy
- HTTPS loads on the Traefik dashboard host
- Dashboard prompts for auth
- Dashboard only allows the approved source IP/CIDR
- `/app/staging/traefik/logs/access.log` is being written
- Linode backups are enabled
- No public DB port is open

## Not in scope
- Clerk auth integration
- App RBAC
- MySQL deployment
- CI deploy workflow
- Feature code

## Next phase
Phase 4 — Identity shell
