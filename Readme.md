# monopoly

fork from https://github.com/intrepidcoder/monopoly

A JavaScript/HTML/CSS Monopoly implementation with full game play. Supports two-eight players.

Play online at [http://www.intrepidcoder.com/projects/monopoly/](http://www.intrepidcoder.com/projects/monopoly/).

Includes an experimental capability to play against an AI. A test AI for demonstration purposes is included.

## Deploy

- CI (`.github/workflows/ci.yml`) runs on push to `master`, pull requests and manual dispatch. It runs server tests, builds the client, then builds the Docker image and smoke-tests `/health` and the non-root user. It has no secrets and deploys nothing.
- Production runs on this machine as the Docker container `monopoly` (image `monopoly:local`), bound to `127.0.0.1:3500` (container port 5000).
- Cloudflare tunnel: cloudflared proxies https://mono.dvachini.cc to `127.0.0.1:3500`, so recreating the container is enough.
- Deploy: run `scripts/deploy-local.sh` (`DEPLOY_PULL=1` to `git pull --ff-only` first; `HOST_PORT` overrides the health-check port). It builds the image, runs `docker compose -f deploy/compose.yml up -d --no-build` and waits up to 40s for `/health`.
- Rollback: the previous image is tagged `monopoly:previous`. If the health check fails, the script prints the last 50 log lines, restores that image, recreates the container, prints `ROLLED BACK` and exits 1.
- Singa is no longer used. There is no SSH, Docker Hub or `.env` upload deploy.
