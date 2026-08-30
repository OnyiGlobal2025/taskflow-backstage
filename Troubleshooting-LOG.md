1. Nested repository folders (accidental repo-inside-repo)

Symptom: Created taskflow-backstage and then created the other three repo folders inside it, so taskflow-app/gitops/infra were nested under taskflow-backstage. Pushing would have swallowed all four into one repo.
Cause: VS Code was opened inside a repo folder rather than the parent, so new folders landed one level too deep.
Fix: Moved the three folders out to be siblings; established the rule that the folder opened in VS Code must be the parent that holds all repos, never a repo itself.

2. Documents vs Downloads — placeholder folders were not real repos

Symptom: The taskflow-app/infra/gitops folders in Documents errored not a git repository; the real cloned repos with actual code lived in Downloads/taskflow-eks-platform (Project 1). Risk of pushing empty doc-only folders over real project code.
Cause: Today's doc work was done in fresh Documents folders that were never git clones; the true GitHub-linked clones were elsewhere.
Fix: Located the real repos with a .git search, worked in the real clones under taskflow-eks-platform, deleted the Documents placeholders. One true copy per repo.

3. GitLab remote instead of GitHub (from the outage)

Symptom: git remote -v on the real taskflow-infra showed gitlab.com, not GitHub.
Cause: During an earlier GitHub outage, repos were pushed to GitLab as a temporary parking spot.
Fix: Confirmed GitHub was back and had the full latest code, then git remote set-url origin back to GitHub before pushing docs.

4. Preserving Project 1 READMEs (merge, not overwrite)

Symptom: Risk of the new TechDocs READMEs wiping the existing Project 1 documentation.
Cause: Both the old project README and the new Backstage descriptor wanted the same README.md.
Fix: Merged — kept the original Project 1 README on top, added a divider and an "Internal Developer Portal (Backstage / TechDocs)" section below. Nothing lost.

5. Node version mismatch (v20 vs v22) across shells

Symptom: PowerShell had Node v22.22.1; Git Bash defaulted to v20.19.6. Backstage 1.46+ requires Node 22/24 — scaffolding under v20 would fail partway.
Cause: Two Node installs; Git Bash's .nvm served the older v20 first on PATH.
Fix: nvm install 22 && nvm use 22 && nvm alias default 22. The alias default makes it stick in new terminals. (Note: fresh Git Bash sessions still sometimes need nvm use 22.)

6. Corepack EPERM / Yarn not on PATH

Symptom: corepack enable failed with EPERM: operation not permitted writing to C:\Program Files\nodejs\; later the scaffold failed at yarn install because yarn was "not recognized."
Cause: Corepack needed admin rights to write shims; Yarn wasn't globally available.
Fix: Skipped corepack, installed Yarn globally with npm install --global yarn. The scaffold then pinned its own Yarn 4.x per-project.

7. Scaffold yarn install network failures (DNS / timeout on tethering)

Symptom: getaddrinfo ENOTFOUND registry.yarnpkg.com, then ETIMEDOUT after several minutes. Install died repeatedly.
Cause: Unstable USB tethering dropping during a large (~660 MiB) download.
Fix: Switched registry to the npm mirror (yarn config set npmRegistryServer "https://registry.npmjs.org"), which got further; ultimately completed by re-running (Yarn 4 resumes from where it stopped — no progress lost). Key lesson: the big install is the one bandwidth-heavy step; it always resumes on retry.

8. Missing .yarn/releases after the merge

Symptom: yarn start in the real repo: Cannot find module '...\.yarn\releases\yarn-4.13.0.cjs'.
Cause: The merge deliberately excluded the huge .yarn cache, but that also dropped .yarn/releases/, which holds the pinned Yarn binary the repo needs.
Fix: Copied only .yarn/releases (small — the binary, not the cache) into the real repo. Rule learned: exclude .yarn/cache, but keep and commit .yarn/releases.

9. node_modules not portable — needed a fresh install

Symptom: yarn start failed with Couldn't find the node_modules state file.
Cause: The merge (correctly) excluded node_modules; native modules (better-sqlite3, esbuild, isolated-vm) are built for their exact path and aren't safe to copy.
Fix: Ran yarn install in the real repo location. Lesson: node_modules is disposable and regenerated per location with yarn install, never copied.

10. Kubernetes plugin crash → empty catalog (the big one)

Symptom: Backend threw Plugin 'kubernetes' threw an error during startup … Failed to instantiate service 'core.auth' for 'kubernetes' … IPC request 'DevDataStore.load' timed out, which shut down the whole process and left the catalog at 0 components.
Cause: The scaffolded kubernetes backend plugin fails to initialize in local dev with no cluster wired up, and its crash cascades to catalog ingestion.
Fix: Commented out backend.add(import('@backstage/plugin-kubernetes-backend')); in packages/backend/src/index.ts. Backend then started clean and the catalog populated. To be re-enabled and configured when Kubernetes integration is built.

11. TechDocs build failed — required Docker

Symptom: TechDocs tab: Failed to generate docs … This operation requires Docker. Docker does not appear to be available. plus a 404.
Cause: Scaffold defaults TechDocs generator to runIn: 'docker'; no Docker running.
Fix: Installed local mkdocs tooling (pip install mkdocs-techdocs-core, gives mkdocs 1.6.1 + techdocs-core 1.7.0) and set techdocs.generator.runIn: 'local' in app-config.yaml. Docs then built directly via local mkdocs, no Docker.

12. platform-team group not found — the stubborn one

Symptom: Every component showed owner platform-team, but the group didn't exist in the catalog; each entity showed the orange warning Entities not found are: group:default/platform-team. The catalog-org.yaml file existed, was pushed, was valid YAML, and its location was registered — yet it never ingested, with no error in the logs.
Cause: The catalog-org.yaml location was added without a rule permitting Group/User kinds, so Backstage's catalog rules silently rejected the entities — no crash, no log, just skipped.
Fix: Added rules: - allow: [User, Group] to that location entry in app-config.yaml. The Platform Team group loaded immediately and every component's ownership resolved. (Also switched the org file from a blob URL to a local - type: file path during debugging.)

13. Scaffold placeholder descriptor (john@example.com)

Symptom: An entity taskflow-backstage-app appeared with owner john@example.com, type website.
Cause: The scaffold's generated catalog-info.yaml had placeholder metadata; we hadn't rewritten it.
Fix: Replaced it with a proper descriptor — name taskflow-backstage, owner platform-team, correct type, plus the techdocs-ref annotation. The orphaned old entity resolved on refresh.

14. Backend startup cascade — DevDataStore IPC timeout (local dev only)

Symptom: On some yarn start runs the backend failed with BackendStartupError — several plugins at once (search, user-settings, notifications, signals, mcp-actions) all failing on DevDataStore.load … timed out. The frontend then loaded but showed "Failed to load entity types" with a stalled, spinning catalog.
Cause: DevDataStore is the dev CLI↔backend IPC channel used to restore SQLite state between restarts. On a resource-constrained machine the restore stalls, and every plugin waiting on it times out together — not a single-plugin fault. There is no app-config timeout setting for this.
Fix: Local-dev mitigation, not a code fix. Start with localhost browser tabs closed to free memory; if the cascade appears, clear the dev SQLite cache and restart: rm -f packages/backend/*.sqlite && yarn start. This issue is local-dev-only — it disappears entirely under the Phase 3 in-cluster deployment (real Postgres, no dev-CLI IPC), so it is mitigated by design rather than code-fixed.


15. TechDocs mermaid — raw code, then rendered

Symptom: Architecture diagrams showed as raw ```mermaid code blocks, not diagrams.
Cause: Rendering requires the frontend addon; it was deliberately deferred from Phase 0. The mkdocs.yml files were pre-wired with the pymdownx.superfences mermaid fence back in Phase 0.
Fix: Installed backstage-plugin-techdocs-addon-mermaid (yarn --cwd packages/app add ...) and wired it into the new frontend system in App.tsx — adding techDocsPlugin from @backstage/plugin-techdocs/alpha and techDocsMermaidAddonModule, both in the createApp features array. Diagrams then rendered in the browser.

16. Mermaid edge label truncated

Symptom: A diagram edge label showed "namespaces via kubectl pos" — cut off.
Cause: The <br/> line break inside a mermaid edge label doesn't render; the long label overflowed.
Fix: Shortened the label to kubectl post-apply in architecture.md.

A few cross-cutting lessons worth stating in the README (they tie the incidents together and read as real operational judgment):

The recurring DevDataStore.load timed out signature (issues 10, 14) is one underlying flakiness surfacing on different plugins — diagnosing it as one root cause rather than many is the real insight.
The catalog allow rule (issue 12) is the classic "silent rejection, no error log" trap — the fix was found by reasoning about catalog rules, not from any error message.
node_modules and .yarn/cache are disposable/regenerated; .yarn/releases must be kept (issues 8, 9).
The whole Documents/Downloads/GitLab tangle (2, 3) is a lesson in verifying git remote -v and .git presence before acting, never assuming a folder is the repo you think it is.

## Issue 17: Backstage pod CrashLoopBackOff — RDS hostname NXDOMAIN

**Phase:** Project 5, Phase 3 (Backstage deployment to EKS)
**Date:** 2026-08-30

### Symptom

After `helm install backstage`, the pod reached `Running` but never became ready (`0/1`), and restart count climbed steadily (2 restarts in ~5 minutes). The liveness probe was killing the container on a loop.

`kubectl logs -n backstage -l app=backstage --previous --tail=80` showed:

```
Failed to connect to the database to make sure that 'backstage_plugin_app' exists,
Error: getaddrinfo ENOTFOUND taskflow-backstage.ce54ui0w20lkx.us-east-1.rds.amazonaws.com
```

### Investigation

The key signal was **`ENOTFOUND`, not `ECONNREFUSED` or `ETIMEDOUT`**. That distinguishes DNS resolution failure from connectivity failure — the pod never turned the hostname into an IP, so it never reached the network layer at all. This ruled out security groups, routing, and the database itself before any of them were checked.

Ruled out in order:

**1. RDS security group** — inbound TCP 5432 open to `10.0.0.0/16` (whole VPC). Nodes at `10.0.0.x` / `10.0.4.x` were covered. Not the cause.

```bash
SG=$(aws rds describe-db-instances --db-instance-identifier taskflow-backstage \
  --region us-east-1 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)
aws ec2 describe-security-groups --group-ids $SG --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions' --output json
```

**2. VPC DNS attributes** — private RDS endpoints only resolve when both are enabled. Both returned `true`.

```bash
VPC=$(aws eks describe-cluster --name taskflow-eks-cluster --region us-east-1 \
  --query 'cluster.resourcesVpcConfig.vpcId' --output text)
aws ec2 describe-vpc-attribute --vpc-id $VPC --attribute enableDnsSupport \
  --region us-east-1 --query 'EnableDnsSupport.Value'
aws ec2 describe-vpc-attribute --vpc-id $VPC --attribute enableDnsHostnames \
  --region us-east-1 --query 'EnableDnsHostnames.Value'
```

**3. VPC mismatch** — RDS could have landed in the default VPC instead of the cluster's. It had not; both were `vpc-0c35d01802c2b2f00`, subnet group `taskflow-backstage-db-subnet-group`, `PubliclyAccessible: False`.

```bash
aws rds describe-db-instances --db-instance-identifier taskflow-backstage \
  --region us-east-1 \
  --query 'DBInstances[0].[DBSubnetGroup.VpcId,PubliclyAccessible,DBSubnetGroup.DBSubnetGroupName]' \
  --output text
```

**4. CoreDNS health** — tested resolution from inside the cluster network.

```bash
kubectl run dnstest --rm -it --restart=Never --image=busybox:1.36 \
  -n backstage -- nslookup taskflow-backstage.ce54ui0w20lkx.us-east-1.rds.amazonaws.com
```

CoreDNS **answered** from `172.20.0.10` with a definitive `NXDOMAIN` rather than timing out. A timeout would have meant broken CoreDNS; an authoritative "this name does not exist" meant CoreDNS was healthy and the *name* was wrong.

That narrowed the problem to the hostname string itself.

### Root cause

The RDS endpoint had been read off a terminal table and transcribed by hand into `values.yaml`, picking up one extra character:

```
Used:   taskflow-backstage.ce54ui0w20lkx.us-east-1.rds.amazonaws.com
Actual: taskflow-backstage.ce54ui0w20kx.us-east-1.rds.amazonaws.com
                                     ^ spurious "l"
```

Every layer of infrastructure was correctly configured. The hostname simply did not exist.

### Fix

Verified the true endpoint byte-for-byte:

```bash
aws rds describe-db-instances --db-instance-identifier taskflow-backstage \
  --region us-east-1 --query 'DBInstances[0].Endpoint.Address' \
  --output text | cat -A
```

`cat -A` renders every character explicitly and marks end-of-line with `$`, exposing both the real string and any trailing whitespace. (The `^M$` shown is Windows CRLF from Git Bash, not part of the hostname.)

Corrected `postgres.host` in `helm/backstage/values.yaml`, then:

```bash
helm upgrade backstage . --namespace backstage
kubectl rollout status deployment/backstage -n backstage --timeout=300s
```

### Prevention

`rds.tf` declared **no output for the endpoint** — which is why the value was transcribed by eye instead of copied programmatically. Adding an output removes the entire class of error:

```hcl
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint hostname for Backstage"
  value       = aws_db_instance.backstage.address
}
```

The endpoint can then be piped straight into the Helm values with no human in the loop:

```bash
helm upgrade backstage . --namespace backstage \
  --set postgres.host=$(terraform -chdir=../../../taskflow-infra/terraform output -raw rds_endpoint)
```

### Lessons

- **Read the error class, not just the error.** `ENOTFOUND` = DNS, `ECONNREFUSED` = reached the host but nothing listening, `ETIMEDOUT` = blocked in transit. Each points at a different layer and eliminates the others.
- **`NXDOMAIN` vs timeout is the same distinction one level down.** An answering resolver returning "no such name" exonerates DNS infrastructure and indicts the query.
- **Any value transcribed by hand is a defect waiting to happen.** If Terraform created a resource, Terraform should output its identifiers.
- Probe tuning was correct and not implicated — readiness at 30s and liveness at 90s gave the migration window room. The pod was failing for a real reason.

Issue 18 — RDS rejected unencrypted connections (no pg_hba.conf entry ... no encryption). Root cause: RDS PostgreSQL requires SSL by default. Fixed properly by mounting the AWS RDS regional CA bundle as a ConfigMap and pointing ssl.ca at it via Backstage's $file directive — full chain verification, not rejectUnauthorized: false. Includes the reasoning for ConfigMap over baking the PEM into the image: CA rotation becomes a config update, not a rebuild.

Issue 19 — Kubernetes Secret created with two empty values. read -s silently failed to capture input; kubectl get secret showed DATA 2 because that counts keys, not content. Detected via base64 -d | wc -c returning 0. Lesson: verify secret contents, never just presence.

Issue 20 — Probes returned 404 against /healthcheck. Current Backstage serves /.backstage/health/v1/readiness and /.backstage/health/v1/liveness. The pod was healthy the whole time and being killed by a misconfigured probe. Also: no wget or curl in node:22-trixie-slim — used node -e with the http module to test from inside the container.

Issue 21 — Dockerfile not at repo root. Backstage's scaffold puts it at packages/backend/Dockerfile; build needs -f packages/backend/Dockerfile . so the context stays at repo root for yarn workspaces and app-config.production.yaml.