# ${{ values.name }}

${{ values.description }}

This service was scaffolded from the TaskFlow golden path template. Everything below
was wired up automatically — no manual setup required.

## What you got

- **Dockerfile** — multi-stage Node 22 Alpine build, non-root runtime, port 5000.
- **Helm chart** — deployment and service, with readiness and liveness probes on
  `/healthz` and pods spread across nodes.
- **CI pipeline** — lint, Semgrep SAST, Docker build, Trivy image scan, and push to
  ECR over OIDC. No long-lived AWS keys.
- **Catalog entry** — this service is already registered in the TaskFlow developer
  portal with its owner and lifecycle.
- **TechDocs** — this page. Add markdown under `docs/` and it appears in the portal.

## Running locally

```bash
npm install
npm start
```

Then visit `http://localhost:5000`. The health endpoint is at `/healthz`.

## Deploying

Delivery is handled by ArgoCD from the `taskflow-gitops` repository. Merges to `main`
build and push a new image; ArgoCD syncs it to the cluster.

## Owner

Maintained by `${{ values.owner }}`.