Read phase 1-2 chats, and all project sources. 

- app-main.zip is the cannon of the repo before deleting it and starting the new one. Note: this only exists for reference. Remember that we are starting over from scratch and following the Phases.
- app-main (1).zip is legacy and should not be read. 
- Any files have been committed to the new repo on github and will not be found in Sources. Assume instructions from the previous Phases have been executed.

Begin phase 3 instructions. 

I’m pulling together Phase 3 from the phase history plus the source files, and I’m treating app-main.zip as reference-only canon while ignoring app-main (1).zip as instructed.

I found the old canon repo structure. It already had environment-specific compose folders, deploy scripts, and docs for secrets, topology, backups, and release ops, so Phase 3 should reuse those patterns conceptually, not the old stack literally.

I’ve got enough to draft the working Phase 3 plan now. One blind spot is that the old repo still shows retired OIDC/Postgres assumptions in some scripts, so I’m treating old code as anti-pattern evidence, not copy/paste material.

Thought for 5m 41s

I read the phase history and the source files. Phase 3 is platform controls. Its job is to make staging a hardened, repeatable shell before auth, database architecture, CI deploy, or feature rebuild. The required outputs are server hardening, private networking, Traefik, TLS, logging, backups, and secret handling.

Do not reuse the old repo scripts blindly. The old canon repo had useful structure, but the project source already says the previous system was still carrying retired assumptions from the prior stack. Treat it as reference, not as runnable baseline.

Phase 3 source-of-truth file

Create this file in the new repo:

docs/rebuild.phase-3-platform-controls.md

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

That matches the project rule that each phase must produce a goal, exact deliverables, source-of-truth decisions, exit criteria, and next-phase handoff.

Do this now
1) Harden the staging Linode

Run these on the staging server as a sudo-capable user.

Ubuntu’s UFW docs show enabling/disabling with ufw enable and opening ports with ufw allow 22. The UFW man page also notes you should allow SSH before enabling, so you do not lock yourself out. Docker’s Ubuntu install docs say to use Docker’s apt repository and note that published container ports can bypass UFW rules, so in this phase you should publish only Traefik’s 80/443 ports.

sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg ufw apache2-utils jq

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
2) Install Docker Engine and Docker Compose plugin

Docker’s official Ubuntu instructions use the apt repository and install docker-ce, containerd.io, docker-buildx-plugin, and docker-compose-plugin. Docker’s Compose docs say the repo install is preferred because manual installs do not auto-update.

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: jammy
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

Now fix the Ubuntu codename if needed.

. /etc/os-release
sudo sed -i "s/Suites: jammy/Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}/" /etc/apt/sources.list.d/docker.sources

Then install Docker.

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run hello-world
docker compose version

If your deploy user for staging is stage_deploy, add it to the docker group:

sudo usermod -aG docker stage_deploy

Then fully log out and back in before testing docker ps.

3) Create the staging platform directories
sudo mkdir -p /app/staging/traefik/acme
sudo mkdir -p /app/staging/traefik/logs
sudo mkdir -p /app/staging/releases
sudo mkdir -p /app/backups

sudo touch /app/staging/traefik/acme/acme.json
sudo chmod 600 /app/staging/traefik/acme/acme.json

sudo chown -R stage_deploy:stage_deploy /app/staging
sudo chown -R stage_deploy:stage_deploy /app/backups

Create the shared Docker network that later app containers will join:

docker network inspect edge >/dev/null 2>&1 || docker network create edge
4) Prepare the Traefik dashboard password hash

Traefik’s Docker guide explicitly recommends securing the dashboard and shows generating a basic-auth hash with htpasswd. The same guide also covers Docker provider setup, port 80/443 entrypoints, HTTP-to-HTTPS redirect, and access logs.

Run this on the server and copy the full output:

htpasswd -nb admin 'CHANGE-THIS-NOW' | sed -e 's/\$/\$\$/g'
5) Create the Traefik .env file on the server

Use the exact values from your Phase 2 environment map for hostnames. If Phase 2 did not define a dashboard hostname, add one now, such as ops-staging.mecplans101.com.

Create:

/app/staging/traefik/.env

TRAEFIK_ACME_EMAIL=YOUR_EMAIL
TRAEFIK_DASHBOARD_HOST=ops-staging.mecplans101.com
TRAEFIK_DASHBOARD_AUTH=PASTE_HASH_FROM_HTPASSWD
ADMIN_ALLOWLIST=YOUR.PUBLIC.IP.ADDRESS/32
6) Create the Traefik compose file

Create:

/app/staging/traefik/docker-compose.yml

services:
  traefik:
    image: traefik:v3.6
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    command:
      - --api.dashboard=true
      - --api.insecure=false
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=edge
      - --certificatesresolvers.le.acme.email=${TRAEFIK_ACME_EMAIL}
      - --certificatesresolvers.le.acme.storage=/acme/acme.json
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web
      - --log.level=INFO
      - --accesslog=true
      - --accesslog.format=json
      - --accesslog.filepath=/logs/access.log
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme:/acme
      - ./logs:/logs
    networks:
      - edge
    labels:
      - traefik.enable=true
      - traefik.http.routers.dashboard.rule=Host(`${TRAEFIK_DASHBOARD_HOST}`)
      - traefik.http.routers.dashboard.entrypoints=websecure
      - traefik.http.routers.dashboard.tls=true
      - traefik.http.routers.dashboard.tls.certresolver=le
      - traefik.http.routers.dashboard.service=api@internal
      - traefik.http.routers.dashboard.middlewares=dashboard-auth,dashboard-allow
      - traefik.http.middlewares.dashboard-auth.basicauth.users=${TRAEFIK_DASHBOARD_AUTH}
      - traefik.http.middlewares.dashboard-allow.ipallowlist.sourcerange=${ADMIN_ALLOWLIST}

networks:
  edge:
    external: true
7) Start Traefik
cd /app/staging/traefik
docker compose --env-file .env up -d
docker ps
docker compose logs -f traefik
8) Validate TLS and logging

Traefik’s official Docker guide includes HTTPS redirect and access logs, and its dashboard can be secured behind auth.

Check these in order:

curl -I http://ops-staging.mecplans101.com
curl -I https://ops-staging.mecplans101.com
docker compose logs --tail=50 traefik
ls -lah /app/staging/traefik/logs

Expected result:

HTTP returns a redirect to HTTPS
HTTPS loads
browser prompts for username/password
access log file exists
9) Enable backups

Linode’s docs say backups are a paid add-on, store up to four retained backups, and are full file-based snapshots. Linode also warns that snapshot-based backups can leave MySQL files unclean if a snapshot catches a transaction in progress, so later you still need DB dumps in Phase 6.

In Cloud Manager:

Open the staging Linode.
Open Backups.
Click Enable Backups.
Pick the backup window.

Then add a simple config backup on the server:

sudo tee /usr/local/bin/backup-staging-config.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf /app/backups/staging-config-$STAMP.tgz /app/staging/traefik
find /app/backups -type f -name 'staging-config-*.tgz' -mtime +14 -delete
EOF

sudo chmod +x /usr/local/bin/backup-staging-config.sh

Add it to cron:

sudo crontab -e

Add this line:

15 2 * * * /usr/local/bin/backup-staging-config.sh
10) Record GitHub staging transport secrets

Phase 3 includes secret handling, but not Clerk or DB runtime secrets yet. This phase should only lock the deploy transport secrets and Traefik operational values. The project source is clear that secrets must be environment-specific and validated early, not hardcoded or casually copied between environments.

In GitHub > Settings > Environments > staging, add:

Secrets

STAGING_SSH_HOST
STAGING_SSH_USER
STAGING_SSH_KEY
STAGING_SSH_HOST_KEY

Variables

STAGING_TRAEFIK_DASHBOARD_HOST
STAGING_TRAEFIK_ACME_EMAIL

Do not add Clerk secrets yet. That belongs to Phase 4.

Private networking decision for now

Your source-of-truth says MySQL must be private-only and internal services should use private networking. If you later split the DB onto a separate host, put it on Linode VPC/private networking and do not open the DB port publicly. Linode’s VPC docs describe VPC as the network-isolation layer with subnets in the same data center, and your project baseline requires the DB to stay private-only.

Phase 3 pass/fail

Phase 3 is complete when all of these are true:

ufw status shows only expected public ports
Docker Engine works
Docker Compose works
Traefik is running
HTTPS works on the dashboard host
dashboard requires auth
dashboard is IP-restricted
access log is being written
Linode backups are enabled
no database port is public
the repo contains docs/rebuild.phase-3-platform-controls.md
Next phase

After this, move to Phase 4 — Identity shell. That is where Clerk gets integrated at the shell level with sign-in/out, session validation, allowed origins, and backend token verification.

If you want, next message I’ll turn this into a Phase 3 execution checklist you can follow line by line without thinking.