# ${{ values.name }}

${{ values.description }}

Scaffolded from the TaskFlow golden path. Full documentation lives in the
[TaskFlow developer portal](http://localhost:7007/catalog/default/component/${{ values.name }}/docs)
and in [`docs/`](./docs/index.md).

## Quick start

```bash
npm install
npm start
```

- Service: `http://localhost:5000`
- Health: `http://localhost:5000/healthz`

## What's included

| Concern | Implementation |
|---|---|
| Container | Multi-stage Dockerfile, Node 22 Alpine |
| Deployment | Helm chart in `helm/` |
| CI | Semgrep SAST, Trivy image scan, ECR push over OIDC |
| Delivery | ArgoCD, from `taskflow-gitops` |
| Catalog | `catalog-info.yaml`, auto-registered |
| Docs | MkDocs + TechDocs, rendered in-portal |

Owned by `${{ values.owner }}`.