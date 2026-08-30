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

## Issue 18: RDS rejected unencrypted connections

**Phase:** Project 5, Phase 3 (Backstage deployment to EKS)
**Date:** 2026-08-30

### Symptom

After fixing the hostname (Issue 17), the pod still crash-looped. Logs showed:

```
Failed to connect to the database to make sure that 'backstage_plugin_signals' exists,
error: no pg_hba.conf entry for host "10.0.1.146", user "backstage_admin",
database "postgres", no encryption
```

### Investigation

This is a *better* error than the previous one. DNS resolved, TCP connected, and PostgreSQL itself answered — it rejected the connection at the authentication stage. The operative phrase is `no encryption`: RDS PostgreSQL requires SSL by default, and the client connected in plaintext.

### First attempt (rejected)

The quick fix is `PGSSLMODE=require` as a container env var. This did not work, because the Backstage `pg` client reads its SSL configuration from `app-config.production.yaml`, which overrides the environment variable.

The next quick fix would have been:

```yaml
ssl:
  rejectUnauthorized: false
```

**This was deliberately rejected.** It encrypts the connection but skips certificate chain validation, leaving the connection open to man-in-the-middle attack from inside the VPC. It is also the kind of line a reviewer greps for, and it cannot be defended in an interview. "Cluster-internal" does not justify unverified TLS.

### Root cause

RDS PostgreSQL enforces SSL. Node's default trust store does not contain the Amazon RDS certificate authority, so once SSL was negotiated the connection failed a second time with `self-signed certificate in certificate chain`.

### Fix (production-grade)

Mount the AWS RDS regional CA bundle into the pod and point Backstage at it, so Node performs full chain verification.

```bash
curl -o rds-ca-us-east-1.pem \
  https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
head -1 rds-ca-us-east-1.pem   # must print -----BEGIN CERTIFICATE-----

kubectl create configmap rds-ca-bundle \
  --namespace backstage \
  --from-file=rds-ca-us-east-1.pem
```

`app-config.production.yaml`:

```yaml
database:
  client: pg
  connection:
    host: ${POSTGRES_HOST}
    port: ${POSTGRES_PORT}
    user: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
    ssl:
      ca:
        $file: /etc/ssl/rds/rds-ca-us-east-1.pem
```

`$file` is Backstage's built-in file-substitution directive — it reads the PEM from the mounted path at startup.

Helm chart additions (`values.yaml`):

```yaml
rdsCa:
  configMapName: rds-ca-bundle
  fileName: rds-ca-us-east-1.pem
  mountPath: /etc/ssl/rds
```

`templates/deployment.yaml`:

```yaml
      volumes:
        - name: rds-ca
          configMap:
            name: {{ .Values.rdsCa.configMapName }}
# ...
          volumeMounts:
            - name: rds-ca
              mountPath: {{ .Values.rdsCa.mountPath }}
              readOnly: true
```

### Design decisions

**ConfigMap rather than baking the PEM into the image.** The CA bundle rotates on Amazon's schedule, independent of application code. Mounting it means a CA rotation is a ConfigMap update and a pod restart — not an image rebuild and redeploy. Same separation-of-concerns reasoning as not baking credentials into images.

**Regional bundle (`us-east-1-bundle.pem`) rather than `global-bundle.pem`.** Contains only the CAs for the region actually being connected to. A smaller trust surface is the correct default.

### Lessons

- `no encryption` in a `pg_hba.conf` error means the server required SSL and the client didn't offer it — an authentication-stage rejection, not a network problem.
- Configuration files can override environment variables. `PGSSLMODE` had no effect because `app-config.production.yaml` set SSL config explicitly.
- **Encryption is not authentication.** `rejectUnauthorized: false` gives the first without the second. Mounting the CA gives both, for roughly ten extra minutes of work.

---

## Issue 19: Kubernetes Secret created with empty values

**Phase:** Project 5, Phase 3
**Date:** 2026-08-30

### Symptom

With TLS working, the pod still crash-looped. New error:

```
SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

### Investigation

The error means the password reached the driver as `undefined` or empty, not that it was wrong. Checked what the container actually received:

```bash
POD=$(kubectl get pods -n backstage -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n backstage $POD -- sh -c \
  'echo "HOST=[$POSTGRES_HOST] USER=[$POSTGRES_USER] PASS_LEN=[${#POSTGRES_PASSWORD}]"'
```

Output: `HOST=[...] USER=[backstage_admin] PASS_LEN=[0]`

Printing the length rather than the value keeps credentials off the screen while still being diagnostic.

Verified the Helm template was correct — both `secretKeyRef` blocks were present and well-formed. So the template was fine and the secret itself was suspect:

```bash
kubectl get secret backstage-secrets -n backstage \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d | wc -c   # → 0
kubectl get secret backstage-secrets -n backstage \
  -o jsonpath='{.data.GITHUB_TOKEN}' | base64 -d | wc -c        # → 0
```

Both keys existed with **zero-length values**.

### Root cause

The secret was originally created using `read -s` to capture values interactively:

```bash
read -s -p "GitHub PAT: " GH_PAT && echo
read -s -p "DB password: " DB_PASS && echo
kubectl create secret generic backstage-secrets \
  --namespace backstage \
  --from-literal=GITHUB_TOKEN="$GH_PAT" \
  --from-literal=POSTGRES_PASSWORD="$DB_PASS"
```

`read -s` never captured the input — the prompts displayed, but the variables stayed empty. `kubectl` dutifully created two keys with empty strings.

**Critically, `kubectl get secret` showed `DATA 2`, which looked correct.** `DATA` counts *keys*, not content. The secret appeared healthy for two hours.

### Fix

```bash
kubectl delete secret backstage-secrets -n backstage

kubectl create secret generic backstage-secrets \
  --namespace backstage \
  --from-literal=GITHUB_TOKEN='<value>' \
  --from-literal=POSTGRES_PASSWORD='<value>'
```

Verified before redeploying — GITHUB_TOKEN 40 chars (correct for a classic PAT), POSTGRES_PASSWORD 11 chars (matching the value used for `TF_VAR_backstage_db_password`).

Single quotes prevent Bash from interpreting `$`, `!`, or backticks in the password. Trade-off: values land in `~/.bash_history`; clear with `history -c` if that matters.

### Lessons

- **`DATA 2` proves keys exist, not that they contain anything.** Always verify secret contents:
  ```bash
  kubectl get secret <name> -n <ns> -o jsonpath='{.data.<KEY>}' | base64 -d | wc -c
  ```
- `read -s` fails silently. Any input method with no feedback needs verification immediately after.
- Verify at the boundary the application sees. `PASS_LEN=[0]` from inside the container was the decisive measurement — it proved the problem was upstream of the app, and the length-only output kept it safe to run.

---

## Issue 20: Liveness/readiness probes 404 on `/healthcheck`

**Phase:** Project 5, Phase 3
**Date:** 2026-08-30

### Symptom

Pods restarted roughly every 150 seconds. Application logs showed the backend starting normally, then:

```json
{"method":"GET","status":404,"url":"/healthcheck","userAgent":"kube-probe/1.36"}
```

repeating until the container was killed.

### Root cause

The Helm chart's probes were configured against `/healthcheck`, which current Backstage versions no longer serve. The endpoints moved to:

- `/.backstage/health/v1/readiness`
- `/.backstage/health/v1/liveness`

Every probe returned 404, the liveness probe hit its failure threshold, and Kubernetes killed a perfectly healthy container. **The application was never broken.**

### Investigation note — no shell tools in the image

The obvious check (`kubectl exec ... wget`) failed:

```
exec: "wget": executable file not found in $PATH
```

`node:22-trixie-slim` ships Node but no `wget` or `curl`. Used Node's built-in http module instead:

```bash
POD=$(kubectl get pods -n backstage -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n backstage $POD -- node -e \
  "require('http').get('http://localhost:7007/.backstage/health/v1/readiness',\
r=>{console.log('STATUS',r.statusCode);r.on('data',d=>process.stdout.write(d))})"
```

Output: `STATUS 200 {"status":"ok"}` — path confirmed, and simultaneously proved the backend was serving correctly the whole time.

### Fix

`values.yaml`:

```yaml
probes:
  readinessPath: /.backstage/health/v1/readiness
  livenessPath: /.backstage/health/v1/liveness
```

`templates/deployment.yaml`:

```yaml
          readinessProbe:
            httpGet:
              path: {{ .Values.probes.readinessPath }}
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 6
          livenessProbe:
            httpGet:
              path: {{ .Values.probes.livenessPath }}
              port: http
            initialDelaySeconds: 90
            periodSeconds: 20
            failureThreshold: 3
```

No image rebuild required — probe paths are chart configuration, not application code.

### Design decisions

**Separate readiness and liveness paths.** Readiness reports whether the app can serve traffic; liveness reports whether the process is stuck. Pointing liveness at the readiness endpoint would restart the pod whenever a dependency blipped, rather than only when the process was genuinely wedged.

**Probe timing.** Readiness at `initialDelaySeconds: 30` with `failureThreshold: 6` gives Backstage room to run database migrations on first boot. Liveness at 90s starts well after readiness, so it can never fire during that migration window.

### Lessons

- A crash-looping pod is not necessarily a broken application. Check whether the *probe* is the thing failing before debugging the app.
- Slim base images lack standard debugging tools. Know what the image *does* have — Node, in this case — and use it.
- Health endpoint paths change between framework versions. Verify against the running application rather than assuming.

---

## Issue 21: Dockerfile not at repository root

**Phase:** Project 5, Phase 3
**Date:** 2026-08-30

### Symptom

```
ERROR: failed to build: failed to solve: failed to read dockerfile:
open Dockerfile: no such file or directory
```

(Preceded by a separate failure — `error during connect: ... dockerDesktopLinuxEngine` — because Docker Desktop wasn't running. Started it and retried.)

### Root cause

The Backstage `create-app` scaffold places the backend Dockerfile at `packages/backend/Dockerfile`, not the repository root. `docker build ... .` assumes a root Dockerfile.

### Fix

```bash
docker build -f packages/backend/Dockerfile \
  -t 713923090919.dkr.ecr.us-east-1.amazonaws.com/taskflow-backstage:latest .
```

`-f` sets the Dockerfile path; the trailing `.` keeps the build context at the repository root.

### Why the context must stay at root

Backstage is a Yarn workspaces monorepo. The build needs `package.json`, `yarn.lock`, and `app-config.production.yaml` from the repo root. Running `docker build` from inside `packages/backend/` would scope the context to that directory and the build would fail — or worse, succeed while silently omitting the production config.

The Dockerfile's `CMD` confirms both configs are loaded at runtime:

```dockerfile
CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
```

### Lessons

- Dockerfile location and build context are independent. `-f` sets one, the positional argument sets the other.
- In a monorepo, the context is almost always the repository root regardless of where the Dockerfile sits.

---

## Issue 22: Catalog API 401s and missing entities in the deployed portal

**Phase:** Project 5, Phase 3
**Date:** 2026-08-30

### Symptom (part 1) — 401 Unauthorized

The portal loaded from the cluster, but the catalog page showed `Error: Could not fetch catalog entities` and `Failed to load entity types`. Backend logs:

```json
{"method":"GET","status":401,"url":"/api/catalog/entities/by-query?..."}
{"method":"GET","status":200,"url":"/.backstage/health/v1/liveness"}
```

Probes returned 200 while every `/api/catalog/*` request returned 401 — the backend was healthy but rejecting unauthenticated API calls.

### Root cause (part 1)

`app-config.production.yaml` declared `auth.providers.guest: {}`, but current Backstage refuses guest authentication outside development unless explicitly opted into.

### Fix (part 1)

```yaml
auth:
  providers:
    guest:
      dangerouslyAllowOutsideDevelopment: true
```

**Security note, stated honestly:** guest auth grants full access with no identity. This is acceptable for a cluster-internal, port-forward-only portfolio IDP with no public ingress, no domain, and no real data. A production deployment would wire GitHub OAuth or OIDC instead. The flag is named `dangerously...` deliberately, and the reasoning belongs in the README rather than being quietly enabled.

### Symptom (part 2) — wrong entities

With auth fixed, the catalog rendered — showing exactly one component: `example-website`, from the scaffold's demo data. None of the four real repositories appeared.

### Root cause (part 2)

`app-config.production.yaml` **overrides** the catalog locations from `app-config.yaml`. The Phase 2 registrations lived in `app-config.yaml` and were being discarded. The production config still listed only the scaffold's local example files:

```yaml
- type: file
  target: ./examples/entities.yaml
```

`type: file` cannot work in a deployed pod — those paths refer to the local filesystem.

### Fix (part 2)

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/OnyiGlobal2025/taskflow-app/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/OnyiGlobal2025/taskflow-backstage/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/OnyiGlobal2025/taskflow-gitops/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/OnyiGlobal2025/taskflow-infra/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/OnyiGlobal2025/taskflow-backstage/blob/main/catalog-org.yaml
      rules:
        - allow: [User, Group]
```

`type: url` fetches over HTTPS using the PAT in `GITHUB_TOKEN` — which is the reason that secret exists. The `rules` block on the org location is required for `User` and `Group` entities (same constraint hit in Phase 2).

### Sub-incident — duplicate `locations:` key

On first edit, the new block was inserted while the old one remained, producing two `locations:` keys under a single `catalog:`. YAML accepts this silently and the last key wins, so the rebuild would have changed nothing. Caught before building:

```bash
grep -c "locations:" app-config.production.yaml   # must be exactly 1
tail -3 app-config.production.yaml                # must end on the allow line
```

A second near-miss: the file was edited but **unsaved** (filled dot on the VS Code tab). Docker builds from disk, not from the editor buffer. Verifying from the terminal rather than the editor catches both classes of error.

### Result

All four components appeared, owned by `platform-team`, with tags and descriptions intact — served from EKS, backed by RDS over fully verified TLS, catalog ingested from GitHub via the PAT.

### Lessons

- **Read the status codes together.** Probes at 200 and API at 401 localised the fault to authentication instantly; both failing would have meant something else entirely.
- Backstage config files override rather than merge for list values. Anything set in `app-config.yaml` must be repeated in `app-config.production.yaml` if it's still needed.
- `type: file` catalog locations are development-only. Deployed instances need `type: url`.
- **Verify from the terminal, not the editor.** Unsaved buffers and duplicate YAML keys both fail silently and both cost a full rebuild cycle.

---

## Session note: transient failures that were not bugs

Two failures during this session looked alarming but were environmental:

**`kubectl` lost DNS to the EKS control plane mid-rollout.**

```
dial tcp: lookup A893C...gr7.us-east-1.eks.amazonaws.com: no such host
```

This was the *local machine* failing to resolve the cluster endpoint (USB tethering instability), not a cluster fault. `kubectl rollout status` failing does not mean the rollout failed — it means the watch was interrupted. Confirm actual state with `kubectl get pods` before concluding anything.

**Docker Desktop not running**, producing `error during connect: ... dockerDesktopLinuxEngine`. Started it and retried.

Neither is worth a full entry, but both are worth recognising quickly rather than debugging as if they were application problems.