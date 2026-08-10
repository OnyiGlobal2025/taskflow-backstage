# taskflow-backstage

Internal Developer Portal (IDP) for the **TaskFlow** platform, built on [Backstage](https://backstage.io).

This portal is the front door to TaskFlow: a unified catalog of services, infrastructure, and documentation, with golden-path templates for self-service provisioning.

## Access model

This deployment is **cluster-internal by design** — no public domain, ACM certificate, or ExternalDNS. Access is via `kubectl port-forward`, which keeps running costs near zero and the portal off the public internet.

```bash
kubectl port-forward svc/backstage 7007:80 -n backstage
# open http://localhost:7007
```

## Stack

| Layer | Technology |
|-------|-----------|
| Portal | Backstage |
| Persistence | Amazon RDS for PostgreSQL (`us-east-1`) |
| Runtime | Amazon EKS |
| Catalog source | GitHub org `OnyiGlobal2025` |
| Docs | TechDocs (MkDocs, docs-as-code) |

## Repository layout

```
taskflow-backstage/
├── app-config.yaml          # Backstage configuration
├── catalog/                 # Catalog entities (systems, components, resources)
├── packages/                # Backstage app + backend
├── docs/                    # TechDocs source for this repo
│   ├── index.md
│   └── architecture.md
├── mkdocs.yml               # TechDocs build config
└── README.md
```

## Documentation

Docs are published to TechDocs inside the portal; source lives in [`docs/`](./docs). See [`docs/architecture.md`](./docs/architecture.md) for the system design.

## Account / region

- AWS account: `713923090919`
- Region: `us-east-1`
- Default branch: `main`