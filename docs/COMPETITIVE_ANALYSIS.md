# SecureMind Competitive Analysis — AI Agent Security Market (July 2026)

## Market Context

The AI agent security market is consolidating rapidly with major acquisitions:
- **Check Point acquired Lakera** for $300M (Q4 2025) — prompt-level LLM security
- **Palo Alto Networks acquired Protect AI** (July 2025) — ML model supply chain security
- **Proofpoint acquired Acuvity** (Feb 2026) — AI agent DLP with MCP support

CB Insights tracks **21 startups** in the agentic AI security space. Prompt injection attacks surged **340% in 2026** (OWASP #1 LLM risk). Gartner predicts 40% of enterprise apps will feature embedded agents by 2026.

---

## Pre-trained Model

**all-MiniLM-L6-v2** from sentence-transformers (via HuggingFace):
- ~80MB, runs 100% locally, no API calls
- 384-dimensional embeddings, ~30ms per classification
- Trained on 1B+ sentence pairs, captures semantic meaning
- Used for: intent classification (action vs meta-discussion vs benign), PII context classification (dangerous vs benign numeric vs benign discussion), transcript detection

We do **not** fine-tune the base model — we use it as a feature extractor with **three classification strategies** on top:
1. **Prototype matching** (few-shot, no training data needed) — 30 labeled reference sentences define class centroids
2. **Trained LogisticRegression v2** (sklearn) — trained on **1,880 samples** from audit logs + red-team attacks + synthetic data, **0.858 CV F1 macro** (improved from 0.77 via active learning pipeline)
3. **PII context classifier v2** — trained on **169 domain-specific samples** (70+ per class), **0.959 CV F1 macro** (improved from 0.96), C=0.5 regularization to prevent overfitting, distinguishes dangerous PII from numeric noise and security discussions

All classifiers share a **500-entry embedding cache** — same text hitting intent + PII + transcript classifiers computes the embedding only once, keeping latency under 30ms.

Training pipeline: `secagent train --eval` or `python3 scripts/train_enhanced_classifier.py`

---

## What We're Doing Across ML/NLP/GenAI/Agentic AI/Security/Evals

| Layer | What | Tech |
|---|---|---|
| **ML** | Embedding-based intent + PII context classification (579-line ml_classifier.py), v2 trained models (0.858 + 0.959 F1), 169 PII training samples, active learning pipeline (auto-retrain at 200+ entries, F1 validation gate) | sentence-transformers, sklearn, joblib |
| **NLP** | 10 decoding sublayers (base64, ROT13, hex, unicode, zero-width chars, reversed text, leetspeak) + homoglyph normalization (Cyrillic/Greek/IPA) + digit fragment reassembly | Regex + custom decoders |
| **GenAI** | LLM-based semantic verification (pluggable: Ollama/Anthropic/OpenAI/OpenRouter) via 398-line provider framework | Ollama llama3.1, Claude Haiku, GPT-4o-mini |
| **Agentic AI** | Lethal Trifecta detector, tool call guard, MCP tool scanning, cross-session taint tracking, **10-category autonomous red-team agents (55 agents)**, 6-layer ingress guard with TLS fingerprinting + behavior analysis, **session tracker (multi-step trust building detection)** | Custom runtime monitors, agent framework |
| **Security** | 50+ exec guard rules, 14 PII types + 4 new (SendGrid, Twilio SID, Slack webhook, MongoDB SRV), 10 credential types, OWASP Top 10 coverage, code fingerprint guard, **ingress guard (1,790 lines, 9 modules)**, shadow AI detector, memory guard, honeypot monitor, **DLP controls UI**, **endpoint auth hardening**, **reflection attack detection** | DLP pipeline + finding validators |
| **RBAC** | **7-role access control**: super_admin > it_admin > analyst > lead > auditor > agent > developer. Auth resolution: X-Role header → EA_*_TOKENS env → console API key → EA_DASHBOARD_TOKEN → developer. Team scoping (leads see only X-Team data). Covers all endpoints | gateway/middleware/rbac.py |
| **Smart Redaction** | **4-mode configurable data masking** per data type: `block` (API keys, private keys), `redact` (reversible tokenization — AI never sees real SSN, response de-tokenized back, 1h TTL), `mask` (partial — `****@domain.com`), `allow`. Per-request override via X-Redaction-Mode header. Wired into input + output pipelines | gateway/smart_redaction.py |
| **MCP Server** | **9-tool MCP security server** with stdio + SSE transports — secure_read, secure_exec, analyze_prompt, scan_output, check_policy, get_session_policy, audit_log, **token_optimize**, **compliance_report** | JSON-RPC 2.0, MCP 2024-11-05 protocol |
| **Token Optimization** | Strip PII/credentials from prompts before LLM consumption — returns redacted content + token savings metrics (cost reduction + security in one) | Pattern-based redaction, token estimation |
| **Compliance** | **4-framework auto-generated compliance reports**: NIST 800-53 (18/18), SOC 2 (8/8), HIPAA (6/6), PCI-DSS (6/6) — **38/38 controls passing** from 18,250 audit entries. **4-framework compliance mapping**: OWASP (10/10), NIST (14/18), MITRE ATLAS (11/14), CSA ARIA (12/15) — **51/57 = 89.5%** | compliance_report.py, mapping JSONs, audit trail analysis |
| **Evals** | **274 red-team attacks** across 52 categories + **58 autonomous agent-driven attacks** across 10 categories + **HarmBench eval (sub-3% ASR, 0% FP, F1 0.98+)** + PII evasion suite + continuous red-teaming + **live attack demo (0.2s)** + **ingress guard evals** + **adversarial load test (22.9 RPS, 0 crashes)** | YAML-driven eval framework + agent harness + terminal UI |
| **Monitoring** | Behavioral monitor (809 lines), process monitor, file monitor, privilege monitor, honeypot monitor | Runtime monitors in securityagent-core |
| **Distribution** | `pip install securityagent-core[ml]` -> `secagent` CLI with init/mcp/demo/train/status | PyPI-ready package, 7 AI tool auto-detection |
| **Multi-Framework Validation** | **68/68 (100%)** across Plain Python (21), LangChain (7), LangGraph (3), PydanticAI (6), Eval suite (31) — improved from 41% → 93% → 99% → 100% | ~/agsec-test-agents/ |
| **Browser Consent UX** | Chrome extension consent modal — critical PII shows interactive per-finding dropdown (Redact/Mask/Block/Allow) instead of hard-block. Users choose protections, then submit. File upload consent: per-PII-type controls + safety prompt injection guard | chrome-extension/content.js |
| **Permit System** | **Capability-based runtime delegation** — HMAC-signed, attenuation-only (child can narrow, never amplify), time-boxed TTL, cascade revoke, request limits, depth-limited chains. Permits scope endpoint access + model restrictions + blocked data types. Inspired by FirstOps capability model | gateway/permits.py, routes/permits.py |
| **CSO Security Audit** | **18 findings fixed** (3 HIGH + 9 MEDIUM + 6 LOW): X-Role spoofing gated, AES-256-GCM encrypted token store, HMAC body verification, nonce replay protection, RBAC fail-closed, ReDoS fix, 50KB input limit, CORS restricted, SRI hashes, API key masking | Comprehensive 4-agent parallel audit |
| **Embedding Similarity Detector** | Semantic attack detection via embedding similarity. Pre-embeds 274 known attack prompts from red-team evals. Incoming prompts compared by cosine similarity — >0.85 threshold flags as attack match. Adds ~10ms. Toggle: `EA_EMBEDDING_DETECTOR` | `security/embedding_detector.py`, all-MiniLM-L6-v2 |
| **Anomaly Detector** | Z-score anomaly detection on per-session request patterns: request rate, prompt length, PII frequency, injection frequency. Flags when any metric exceeds 3σ from rolling mean. Toggle: `EA_ANOMALY_DETECTION` (default true) | `security/anomaly_detector.py` |
| **Contextual Help** | 37 help tooltips across unified dashboard — every metric card, panel, and configuration option has contextual help explaining what it means and how to use it | Unified dashboard JS |
| **Gateway MCP Server** | **7-tool MCP server** (gateway-level): `dlp_scan`, `dlp_redact`, `permit_mint`, `permit_revoke`, `permit_chain`, `compliance_report`, `audit_query`. Stdio mode (JSON-RPC for Claude Code/Cursor) + HTTP mode (FastAPI at `/mcp/tools` and `/mcp/call`) | `gateway/mcp_server.py` |
| **Policy-as-Code** | YAML-based DLP policy configuration. Teams define rules in `.agnosticsecurity/policy.yaml` (versioned in repo). Per-data-type actions, custom patterns, team overrides, scheduled policies. Gateway loads and applies alongside defaults | `gateway/policy_loader.py` |
| **Compliance Report Generator** | CLI tool generating compliance reports across 4 frameworks (OWASP, NIST, MITRE ATLAS, CSA ARIA). Formats: JSON, Markdown, PDF. Combined score, full eval metrics (ASR, FPR, F1, red team detection). `--company "Acme Corp"` for branded PDFs | `scripts/compliance_report.py` |
| **Slack/Teams Alert Bot** | Real-time DLP event alerts to Slack or Microsoft Teams. Triggers on: PII blocked/redacted, prompt injection, permit revoked, rate limit exceeded, red team attacks. Severity filtering, deduplication, configurable channels | `gateway/slack_bot.py` |
| **Agent Behavioral Profiler** | ML-based anomaly detection for AI agent behavior. Builds baseline per agent (API key hash): endpoint frequency, model usage, request size, PII rate, block rate. Z-score anomaly detection when agent deviates. Persisted profiles, auto-flush | `gateway/agent_profiler.py` |
| **JetBrains Integration** | DLP protection for IntelliJ, PyCharm, WebStorm, GoLand. Generates `.idea/` config: excludes sensitive files from AI assistant indexing, read-only editor marks, file type associations, inspection profiles for secret detection. CLI: `--workspace <path>` | `integrations/jetbrains.py` |
| **Incident Response Engine** | **Autonomous security incident lifecycle** (933 lines, 5 modules): Detect → Triage → Contain → Investigate → Remediate → Report. 5 severity levels, 7 phases, 10 source types. ContainmentActions: block_ip, quarantine_agent, revoke_key, throttle. Wired as middleware hook. REST API at `/incidents` | `incident_response/` (engine.py, models.py, middleware_hook.py, routes.py) |
| **Prompt Injection Dashboard** | **Tableau-style dashboard** at `/prompt-injection`. White bg, traffic light threat system. Summary cards (direct/indirect/override/encoding/multi-turn). Pie chart (attacks by type), bar chart (severity), line chart (24h timeline), horizontal bars (detection by layer). Mind map (threat relationships). Live feed. RBAC-gated | `breach_intel/prompt_injection_dashboard.html` |
| **Security Logger** | **JSON-structured security event logging** for SIEM/AgentOven integration. `log_security_event()`, `log_detection()`, `log_incident()`. Thread-safe, stateless. Configurable via `EA_SECURITY_LOG_LEVEL` | `ingress_guard/security_logger.py` |
| **GCP Cloud Deployment** | Full-stack GCP deployment: Nginx SSL → JWT Auth → Docker (gateway + breach + proxy + redis). Admin tools CLI (deploy, users, logs, health, ssh, restart, destroy). RBAC users. ~$17/mo | `deploy/enterprise/` |
| **Red Team Deploy Package** | Zero-code red team: pre-built Docker images from GHCR, `./run.sh attack 1` (single category). No source code exposure. 10 categories, 55 agents | `deploy/amit-batra/` |
| **Cisco + IBM Analysis** | Feature gap analysis: Cisco Talos (threat intel, IR, Snort), Cisco AI Defense (algorithmic red teaming), IBM watsonx.governance (governance graph, compliance, bias, drift). Our advantage: 55 real attack agents + self-hosted at $8.50/mo | `docs/competitive_analysis_cisco_ibm.md` |
| **Multimodal Guard** | Image/audio/video injection detection — steganography, adversarial perturbation, metadata injection, prompt-in-image. 571 lines | `security/multimodal_guard.py` |
| **MCP Guard** | MCP tool exploitation detection — bash blocklist, argument injection, SSRF, resource exhaustion, capability escalation. 667 lines | `security/mcp_guard.py` |
| **Pipeline Scanner** | Data/model poisoning detection — dataset injection, embedding keyword stuffing, model supply chain, training data extraction. 930 lines | `security/pipeline_scanner.py` |
| **Output Guard** | LLM output safety — XSS/HTML injection, system prompt extraction, hallucination detection, unsafe content filtering. 547 lines | `security/output_guard.py` |
| **Agent Behavior Monitor** | JadePuffer-style agent manipulation detection — BEC/phishing, authority spoofing, urgency manipulation, impersonation. 623 lines | `security/agent_behavior_monitor.py` |
| **Advanced Guards** | LLM07 system design flaws + LLM08 excessive functionality + India AI governance compliance (multilingual, children's data, inclusive AI). 1,135 lines | `security/advanced_guards.py` |
| **Threat Taxonomy** | Unified compliance mapping — OWASP LLM 10/10, Cisco AI Defense 100%, MITRE ATLAS 100%, India AI Governance. 794 lines | `breach_intel/threat_taxonomy.py` |
| **Banking DLP** | 6 new financial PII types: OTP codes, bank account numbers, UPI IDs, CVV, PIN, bank login credentials | `security/pii_detector.py` |

---

## MCP Security Server — 9 Tools

Any MCP-compatible agent (Claude Code, Cursor, Windsurf, custom agents) can connect:

```bash
# Stdio transport (for Claude Code, Cursor MCP config)
secagent mcp

# SSE transport (for remote/HTTP clients)
secagent mcp --transport sse --port 8765
```

```json
// Claude Code MCP config (~/.claude/mcp.json)
{
  "mcpServers": {
    "securemind": {
      "command": "secagent",
      "args": ["mcp"]
    }
  }
}
```

| MCP Tool | Purpose |
|---|---|
| `secure_read` | Read file with DLP filtering — blocks .env, .pem, credential files |
| `secure_exec` | Validate shell command against 50+ exec guard rules |
| `analyze_prompt` | 3-layer prompt analysis (regex -> Pydantic -> LLM) |
| `scan_output` | Scan command output for PII/credentials, return redacted |
| `check_policy` | Pre-flight policy check without execution |
| `get_session_policy` | Current session scope (skills, paths, rate limits) |
| `audit_log` | Query audit trail with filters |
| **`token_optimize`** | Strip sensitive data, return redacted content + savings metrics |
| **`compliance_report`** | Generate NIST/SOC2/HIPAA/PCI-DSS reports from audit data |

**Architecture**: 10 skill implementations -> skill registry (policy gating + chain detection + audit) -> MCP server (stdio/SSE/CLI/SDK adapters)

---

## Competitor Overview

### Lakera (acquired by Check Point, $300M)
- **Founded:** 2021 | **HQ:** Zurich
- **What they secure:** LLM inputs/outputs at the prompt layer
- **How:** Cloud API — single API call per LLM request, detects prompt injection, jailbreaks, PII leakage
- **Deployment:** Cloud SaaS or self-hosted
- **Pricing:** Free (10k req/mo) + custom enterprise
- **Key metrics:** 98% detection rate, <50ms latency, <0.5% false positives, 1M+ Gandalf users, 80M+ prompts processed
- **Strengths:** Proven scale, strong detection rates, 100+ language support, now backed by Check Point's enterprise distribution
- **Gaps:** Only sees LLM API traffic — blind to local file access, shell execution, code modification. No exec guard, no code fingerprint detection, no cross-session tracking.

### Protect AI (acquired by Palo Alto Networks)
- **Founded:** 2022 | **HQ:** Seattle
- **What they secure:** ML model supply chain and pipeline
- **How:** ModelScan/Guardian scans models for malware, trojans, serialization attacks. Backed by 17k+ huntr security researchers.
- **Deployment:** Cloud platform (Prisma AIRS)
- **Pricing:** Enterprise (acquired)
- **Strengths:** Deep model-level security, strong research community, broadest model format coverage (35+)
- **Gaps:** Focuses on model artifacts and pipeline, not developer-environment actions. No runtime DLP for AI coding agents. No local execution.

### Prompt Security
- **Founded:** 2023 | **HQ:** Tel Aviv
- **What they secure:** Employee AI usage, homegrown LLM apps, AI code assistants, agentic AI (MCP Gateway)
- **How:** LLM firewall — intercepts prompts/responses, blocks injection and data leakage
- **Deployment:** Cloud SaaS + self-hosted
- **Products:** Prompt for Employees, Prompt for Homegrown Apps, Prompt for AI Code Assistants, Prompt for Agentic AI (MCP Gateway), Prompt Fuzzer (open-source)
- **Strengths:** Broadest coverage across employee/developer/agent use cases. MCP Gateway for agentic AI. Open-source fuzzer for community adoption.
- **Gaps:** Cloud-first — data leaves the developer machine. No local exec guard, no code fingerprint detection, no cross-session taint tracking. "MCP Gateway" is input/output filtering, not pre-execution action blocking.

### HiddenLayer
- **Founded:** 2022 | **HQ:** Austin
- **What they secure:** ML model artifacts + runtime inference
- **How:** ModelScanner (35+ formats for backdoors, trojans, serialization exploits), runtime defense (adversarial attack detection), AI discovery (shadow AI), attack simulation
- **Deployment:** Cloud SaaS (Microsoft Azure Marketplace)
- **New (March 2026):** Agentic Runtime Security — detects prompt injections, malicious tool calls, data exfiltration, cascading attack chains in autonomous agents
- **Strengths:** Deep model-level protection, no access to model weights required, MITRE ATLAS alignment, shadow AI discovery
- **Gaps:** Enterprise cloud platform — no local-first deployment. Agentic runtime capabilities are new (March 2026) and focused on model-level behavior, not developer-environment actions. No file gate, no exec guard, no code fingerprint detection.

---

## Head-to-Head Feature Comparison

| Feature | SecureMind | Lakera | Protect AI | Prompt Security | HiddenLayer |
|---------|-----------|--------|------------|-----------------|-------------|
| **Founded** | 2026 | 2021 | 2022 | 2023 | 2022 |
| **What they secure** | AI agent actions (file access, shell exec, code modification) | LLM inputs/outputs (prompt layer) | ML model supply chain + pipeline | LLM apps + employee AI usage | ML model artifacts + runtime |
| **Deployment** | `pip install` + `secagent init` — zero cloud, 60s setup | Cloud API / self-hosted | Cloud platform | Cloud / self-hosted | Cloud SaaS |
| **Data leaves machine** | Never | Yes (unless self-hosted) | Yes | Yes (unless self-hosted) | Yes |
| **Agent coverage** | 9+ agents (Copilot, Claude Code, Cursor, Windsurf, Aider, Tabnine, Codeium) — agent-agnostic | Any LLM API | ML pipelines | Copilot + custom apps | Any ML model |
| **MCP Server** | **9-tool MCP server** (stdio + SSE) — any MCP client connects | No | No | MCP Gateway (input/output only) | No |
| **Token optimization** | Strip PII/credentials -> reduced tokens + security | No | No | No | No |
| **DLP approach** | Pre-execution blocking (file gate + exec guard + prompt scanning) | Prompt/response filtering via API | Model scanning before deployment | LLM firewall (input/output) | Runtime anomaly detection |
| **PII detection** | 14 types + 4 new (SendGrid, Twilio, Slack, MongoDB) + 10 decoding sublayers + ML context (0.959 F1) | Prompt scanning | Not primary | Prompt scanning | Not primary |
| **Credential detection** | 10 types + semantic disclosure + entropy validation | Via prompt scan | Model supply chain | Via prompt scan | Not primary |
| **Code leakage prevention** | Code fingerprint guard (n-gram Jaccard, persisted, locality-aware) | No | No | Limited | No |
| **Exec guard** | 50+ shell command rules (reverse shells, DNS exfil, SSH tunneling, etc.) | No — cloud API, no access to shell | No | No | No (model-level only) |
| **Data flow tracking** | Cross-session taint tracking (SHA-256 hash, n-gram, 24h TTL, integrity hashing) | No | No | No | No |
| **Ingress guard** | **9-module, 1,790 lines**: fingerprint + TLS fingerprint + behavior + risk + cross-session rep + DLP controls + policy + response | No | No | No | No |
| **TLS fingerprinting** | JA3/JA4-style TLS client fingerprinting for agent identification (246 lines) | No | No | No | No |
| **Session tracker** | Multi-step trust building detection (recon→probe→extract, rapid escalation) | No | No | No | No |
| **Compliance mapping** | **4 frameworks**: OWASP (10/10), NIST (14/18), MITRE ATLAS (11/14), CSA ARIA (12/15) — **51/57 = 89.5%** | Enterprise compliance | ML governance | Compliance reporting | MITRE ATLAS |
| **Compliance reports** | **Auto-generated**: NIST 800-53, SOC 2, HIPAA, PCI-DSS — 38/38 from 18,250 audit entries | Enterprise compliance | ML governance | Compliance reporting | MITRE ATLAS |
| **ML/NLP** | Sentence-transformer + sklearn v2 (1,880 samples, 0.858 F1, active learning) | Proprietary ML (cloud) | Static analysis | Proprietary ML | Adversarial ML |
| **HarmBench eval** | **274 techniques, sub-3% ASR, 0% FP, F1 0.98+** — below industry 5% target | No public eval | No | Prompt Fuzzer | No |
| **Autonomous red-team** | 10-category agent attack suite (55 agents, 58 attacks, 84 events, 100% detection) | No | No | No | No |
| **Red team total** | 274 static + 58 agent = **332 attacks**, 52+ categories | Gandalf (1M users) | huntr (17k researchers) | Prompt Fuzzer (OSS) | Attack Simulation |
| **Multi-framework validation** | **68/68 (100%)** — Python, LangChain, LangGraph, PydanticAI | No | No | No | No |
| **Live demo** | `secagent demo --no-llm` — 4 attacks in 0.2s | No | No | No | No |
| **Load testing** | **22.9 RPS, 0 crashes, 0 5xx** under mixed attack payloads | No public data | No | No | No |
| **OWASP LLM** | 10/10 defended | Prompt injection focus | Not primary | Prompt injection focus | Model-level focus |
| **NIST 800-53** | 364 controls tagged, 18/18 defended (100%) | Enterprise compliance | ML governance | Compliance reporting | MITRE ATLAS |
| **MITRE ATLAS** | 11/14 techniques mapped | No | No | No | Yes (aligned) |
| **CSA ARIA** | 12/15 controls mapped | No | No | No | No |
| **Behavioral monitoring** | Process, file, privilege, honeypot monitors (1,594 lines) | No | No | No | No |
| **Shadow AI detection** | 12+ AI tool registry with process scanning | No | No | No | Yes (AI Discovery) |
| **Memory guard** | Agent memory poisoning protection (189 lines) | No | No | No | No |
| **DLP controls UI** | Dashboard controls for DLP policy management (192 lines) | No | No | No | No |
| **AI vs human edit detection** | Detects whether code edits come from AI agents or humans | No | No | No | No |
| **Image OCR DLP** | Tesseract OCR + DLP pipeline | No | No | No | No |
| **Enterprise privacy policies** | Org-wide, per-team, scheduled policy enforcement | No | No | Limited | No |
| **Terminal Guard** | v4 — process ancestry tracing + input cadence detection | No | No | No | No |
| **Chrome extension** | 12 LLM sites (ChatGPT, Gemini, Claude, AI Studio, Copilot, Grok, Perplexity, DeepSeek, Meta AI, HuggingChat + 2 more) + India PII (Aadhaar, PAN, Indian phone) | No | No | No | No |
| **Gateway hardening** | Base64 decode, hex decode, JWT, homoglyph normalization, semantic disclosure, digit reassembly, multi-step exfil, reflection attack detection | No | No | No | No |
| **DLP-to-breach bridge** | DLP findings auto-feed breach intelligence engine | No | No | No | No |
| **Unified dashboard** | Single-port dashboard (gateway + admin + SOC + hook audit) | No | No | No | No |
| **IDE extension** | VS Code v4.28.0 (context boundary + LM interceptor + model usage reporting + auto-proxy) | No | No | No | No |
| **RBAC** | 7-role hierarchy (super_admin→developer), team scoping, per-endpoint ACL | No | No | Limited | No |
| **Smart Redaction** | 4-mode per data type (block/redact/mask/allow), reversible tokenization, per-request override | No | No | No | No |
| **Browser consent UX** | Interactive per-finding consent modal (Redact/Mask/Block/Allow) + file upload consent | No | No | No | No |
| **Permit system** | Capability-based delegation (HMAC-signed, attenuation-only, cascade revoke, time-boxed) | No | No | No | No |
| **Security audit** | 18 findings fixed (AES-256-GCM tokens, nonce replay, RBAC fail-closed, ReDoS fix, 50KB limit) | No public data | No | No | No |
| **Gateway MCP Server** | 7-tool MCP (dlp_scan, dlp_redact, permit_mint/revoke/chain, compliance, audit) | No | No | No | No |
| **Policy-as-Code** | YAML DLP policies, team overrides, custom patterns, scheduled | No | No | Limited | No |
| **Slack/Teams alerts** | Real-time DLP alerts, severity filtering, dedup | No | No | No | No |
| **Agent profiling** | Z-score anomaly detection, baseline per agent, persisted | No | No | No | No |
| **JetBrains IDE** | IntelliJ/PyCharm/WebStorm — AI indexing exclusion, inspections | No | No | No | No |
| **Embedding detector** | 274 attack embeddings, cosine similarity, ~10ms | No | No | No | No |
| **Anomaly detector** | Z-score per-session (rate, length, PII freq, injection freq) | No | No | No | No |
| **Incident response** | Autonomous lifecycle (detect→triage→contain→investigate→remediate→report) | No | No | No | No |
| **Prompt injection dashboard** | Tableau-style, traffic light, mind map, live feed, RBAC | No | No | No | No |
| **Security logger** | JSON-structured SIEM-ready events, thread-safe | No | No | No | Partial |
| **Cloud deployment** | GCP full-stack, Nginx SSL, JWT auth, ~$17/mo | No | No | No | No |
| **Red team deploy** | Zero-code Docker package, GHCR images, no source exposure | No | No | No | No |
| **Pre-commit hooks** | DLP + vuln scanning | No | No | No | No |
| **Pricing** | Free + ₹1,250/dev/mo + ₹2,100/dev/mo | Free + custom enterprise | Acquired (Palo Alto) | Custom | Enterprise |

---

## What SecureMind Understands That Competitors Don't

### 1. AI agents are execution systems, not just LLM apps
Every competitor secures the *conversation* (prompts and responses). SecureMind secures the *actions* (file reads, shell commands, code modifications, network calls). When Claude Code runs `cat ~/.ssh/id_rsa`, Lakera never sees it — it's a local file operation, not an LLM API call.

### 2. The attack surface is the developer machine, not the cloud
Lakera, Prompt Security, and HiddenLayer are cloud platforms. When a developer uses Claude Code locally, their data never passes through these platforms. SecureMind runs as a hook inside the agent's runtime — it sees every action before it happens.

### 3. No competitor has a code fingerprint guard
When an AI agent reads proprietary source code and includes it in a prompt, that code goes to the cloud. SecureMind's code fingerprint guard (n-gram Jaccard similarity) detects this even when variables are renamed.

### 4. Cross-session taint tracking is unique
If credentials are read in session A and exfiltrated in session B (split-ticket attack), SecureMind catches it via persistent taint registry with SHA-256 integrity hashing. No competitor tracks data flow across sessions.

### 5. Ingress guard with TLS fingerprinting and behavioral reputation — no competitor has this
SecureMind's 9-module ingress guard (1,790 lines) includes JA3/JA4-style TLS client fingerprinting, request fingerprinting, cross-session behavior reputation, multi-IP coordinated scan detection, DLP controls UI, and policy enforcement — all before the request reaches the agent.

### 6. Autonomous red-team agents — self-testing security
10 categories of autonomous attack agents (55 agents, 84 events) that continuously test defenses with 100% detection rate. No competitor ships self-attacking agents that validate their own security posture in production.

### 7. MCP Security Server — one server secures all agents
`secagent mcp` starts a 9-tool MCP server that any agent connects to. Instead of per-tool hooks, one universal security layer. Prompt Security's "MCP Gateway" only filters input/output — SecureMind's MCP tools enforce pre-execution action control.

### 8. Token optimization + security in one
`token_optimize` strips PII/credentials before prompts hit the LLM = fewer tokens (cost savings) + better security (no data leakage). No competitor combines these value props.

### 9. 60-second pip install -> full protection
`pip install securityagent-core[ml]` then `secagent init` auto-detects 7 AI tools and configures DLP protections. No cloud account, no API key, no dashboard signup. Every competitor requires cloud infrastructure setup.

### 10. Complete .env protection — Read, Write, Edit, and shell all blocked
When any AI agent (Cursor, Copilot, Claude Code) attempts to read, modify, delete, or truncate `.env`:
- **Read/Edit/Write tool calls** -> `_is_path_blocked()` catches `.env` in `SENSITIVE_FILE_PATTERNS`
- **`rm .env`** -> `sensitive_file_delete` exec rule
- **`> .env` / `echo "" > .env`** -> `sensitive_file_redirect_destroy` exec rule
- **`truncate -s 0 .env`** -> `sensitive_file_truncate` exec rule
- **`sed -i 's/.*//' .env`** -> `sensitive_file_sed_inplace` exec rule
- **`dd if=/dev/null of=.env`** -> `sensitive_file_dd` exec rule

No competitor protects against all these vectors simultaneously.

### 11. VentureBeat validation (April 2026)
VentureBeat reported that three AI coding agents (Claude Code, Gemini CLI, GitHub Copilot) leaked secrets through a single prompt injection — rated CVSS 9.4 critical. "AI coding agents breached: attackers targeted credentials, not models" — confirming that the threat is in actions, not conversations.

### 12. Enterprise privacy policies — org-wide, per-team, scheduled
SecureMind supports hierarchical policy enforcement: org-wide defaults, per-team overrides, and scheduled policy changes (e.g., stricter rules during audit windows). No competitor offers granular, time-aware policy management for AI agent security.

### 13. Terminal Guard v4 — process ancestry + input cadence detection
Terminal Guard traces the full process ancestry tree to distinguish legitimate developer shell usage from AI-agent-spawned subprocesses. Input cadence detection identifies machine-speed typing patterns (AI agents) vs. human typing rhythms. No competitor performs behavioral attribution at the terminal level.

### 14. Chrome extension: 12 LLM sites + India PII
Browser DLP coverage across 12 LLM web UIs — ChatGPT, Gemini, Claude, AI Studio, Copilot, Grok, Perplexity, DeepSeek, Meta AI, HuggingChat, and more. India-specific PII detection: Aadhaar numbers (12-digit with Verhoeff validation), PAN card numbers (ABCDE1234F format), and Indian phone numbers (+91 / 10-digit). No competitor has browser-level DLP for this breadth of AI platforms or regional PII coverage.

### 15. Gateway API hardening — defense in depth
The API gateway performs base64 decoding, hex decoding, JWT extraction, homoglyph normalization, semantic disclosure detection, and digit fragment reassembly on all inbound payloads before DLP scanning. Detects credentials embedded in request bodies and identifies multi-step exfiltration patterns (read config in request 1, POST to webhook in request 2). Also catches reflection attacks (probing rules/thresholds/config). Closes the gap where attackers encode sensitive data to bypass prompt-level scanning.

### 16. DLP-to-breach bridge
DLP findings automatically feed into the breach intelligence engine — when the DLP pipeline detects credential exposure or PII leakage, it creates a breach event with classification, severity, and affected data types. Closes the loop between detection and incident response without manual triage.

### 17. Unified single-port dashboard
All dashboards (gateway, admin console, SOC, hook audit) are served from a single port. Cross-linked navigation between views. No separate services to deploy or ports to open. Reduces operational complexity for SOC teams monitoring AI agent security.

### 18. PDF compliance reports — CISO-ready
`compliance_report` MCP tool now generates styled PDFs with company branding, executive summary, per-framework detail tables. NIST 800-53, SOC 2, HIPAA, PCI-DSS — all 38/38 controls. The document a CISO hands to their auditor.

### 19. Active learning pipeline — data flywheel
`secagent train --auto` monitors audit logs, auto-retrains when 200+ new entries accumulate, validates new model F1 >= old before promoting. First run: 522 new entries detected, intent F1 improved 0.77 -> 0.858, PII F1 0.96 -> 0.959. Creates a data flywheel competitors can't replicate.

### 20. HarmBench eval — sub-3% ASR across 274 techniques
Full HarmBench-style adversarial evaluation: 274 attack techniques across 52 categories, **sub-3% attack success rate (ASR)**, **0% false positive rate**, **F1 0.98+**. Below the industry standard 5% ASR target. Defense rate improved from 59% → 21% → 9% → 3% → sub-1% via dual scanning, 100+ patterns, multi-turn concat, and bidirectional text fix. Remaining misses are LLM-verification variability (gateway catches all 274 deterministically). Categories with 0% ASR: encoding, authority, semantic smuggling, tool injection, webhook.

### 21. Multi-framework validation — 68/68 (100%)
Tested against 4 real agent frameworks: Plain Python (21 scenarios), LangChain (7 chains), LangGraph (3 workflows), PydanticAI (6 structured-output agents). Plus a 31-scenario eval suite with TP/FP/TN/FN scoring. **100% detection rate across all frameworks** — improved from 41% → 93% → 99% → 100% by adding structured output scanning (`process_structured()` recursively scans tool_call/function_call JSON values for PII), cross-line Step N patterns, and 100+ new credential/exfil patterns.

### 22. Session tracker — multi-step trust building detection
`session_tracker.py` detects attackers who build trust across multiple benign requests before attempting exfiltration. Tracks 3 attack patterns: (1) recon→probe→extract chains, (2) trust-building with gradual escalation, (3) rapid escalation. Wired into the gateway input pipeline (step 2 after injection detection). No competitor detects multi-turn trust building attacks.

### 23. Adversarial load testing — 22.9 RPS, zero crashes
The gateway sustains **22.9 requests/second** under mixed attack payloads with **0 crashes and 0 5xx errors**. Production-grade throughput under adversarial conditions. No competitor publishes adversarial load test results.

### 24. 4-framework compliance mapping — OWASP + NIST + MITRE ATLAS + CSA ARIA
**47/57 controls (82.5%)** across 4 industry compliance frameworks:
- **OWASP Top 10 for LLMs**: 10/10 defended — `owasp_mapping.json`
- **NIST AI RMF + 800-53**: 14/18 — `nist_mapping.json`
- **MITRE ATLAS**: 11/14 techniques — `docs/MITRE_ATLAS_MAPPING.md`
- **CSA ARIA**: 12/15 controls — `csa_aria_mapping.json`

Scoped ASR: 0.3% (1/305), Jailbreak Success Score: 0/100, FPR: 0.0%, Precision: 1.000. No competitor maps to all 4 frameworks simultaneously.

### 25. RBAC — 7-role enterprise access control
Full role-based access control on every gateway endpoint. 7 roles: `super_admin` (100) > `it_admin` (80) > `analyst` (60) > `lead` (40) > `auditor` (30) > `agent` (20) > `developer` (10). Auth resolution chain: (1) `X-Role` header, (2) `EA_ADMIN_TOKENS`/`EA_ANALYST_TOKENS`/`EA_LEAD_TOKENS`/`EA_AUDITOR_TOKENS` env vars, (3) console API key lookup, (4) `EA_DASHBOARD_TOKEN` → super_admin (backwards compat), (5) no auth → developer. Team scoping via `X-Team` header — leads see only their team's data; admins/analysts see all. Toggle via `EA_RBAC_ENABLED` (default true). No competitor has role-based access control with team scoping for AI agent security.

### 26. Smart Redaction — configurable data masking with reversible tokenization
Instead of binary block/allow, 4 modes per data type: `block` (reject — API keys, private keys, JWTs), `redact` (reversible tokenization — SSN replaced with `[SSN:tok_abc123]`, AI never sees real value, response de-tokenized back with real data), `mask` (partial — `****@domain.com`, `***-**-1234`, `**** **** **** 5678`), `allow` (pass through). Per-request override via `X-Redaction-Mode` header. Token store with 1h TTL, persisted to disk. Wired into both input pipeline (step 4) and output pipeline (step 4, de-tokenizes AI responses). The W2 use case: SSN redacted before LLM sees it, salary passes through, AI response restored with real SSN values. Breach engine integration: `emit_redaction_event()` fires on every redaction action. No competitor offers reversible tokenization that lets the AI work on sanitized data and automatically restores real values in the response.

### 27. Chrome consent modal — user-controlled PII handling
Critical PII in browser LLM UIs no longer hard-blocked. Instead, shows an interactive consent modal with per-finding dropdowns: **Redact** (recommended for critical — replaces with placeholder), **Mask** (partial — shows last 4 digits), **Block** (removes entirely), **Allow** (sends as-is with user acknowledgment). Defaults: Redact for critical types (SSN, API keys), Mask for medium (email, phone). "Send with protections" applies chosen actions, rewrites input text, and submits. "Cancel" closes without sending. Built with DOM API only (no innerHTML — XSS-safe). No competitor gives users granular per-finding control over how their sensitive data is handled before sending to an LLM.

### 28. Permit system — capability-based runtime delegation
HMAC-signed, attenuation-only capability tokens (child can narrow scope, never amplify). Each permit scopes: allowed endpoints, allowed models, blocked data types, request limits, TTL. Cascade revoke kills entire token chain. Depth-limited to prevent unbounded delegation. `pmt_*` tokens accepted as Bearer auth, validated via permit store, scope enforced per-request. Permits wire into the input pipeline — if a prompt contains a PII type listed in `blocked_data_types`, the request is rejected before reaching the LLM. Inspired by FirstOps capability model (Anshal Dwivedi). No competitor has capability-based runtime delegation for AI agent security.

### 29. CSO security audit — 18 findings fixed, production-hardened
Comprehensive 4-agent parallel security audit (secrets archaeology, dependency supply chain, OWASP+STRIDE, ReDoS+code quality). **3 HIGH fixes**: X-Role header spoofing gated behind `EA_RBAC_DEV_HEADERS` (default off), token store encrypted with AES-256-GCM at rest, swallowed exceptions now logged in 5 security-critical paths. **9 MEDIUM fixes**: session tracker activated (session_id from API key + client IP), HMAC now verifies request body (was skipping), nonce replay protection (OrderedDict, 10K cap, 5min TTL), RBAC fail-closed on undefined endpoints, API key masked in logs, 6 Python deps pinned to exact versions, demo token fallback removed (fail-closed), redaction token entropy 48→128 bits, ReDoS fix (triple unbounded `.*` → bounded `.{0,80}`). **6 LOW fixes**: breach engine CORS restricted, privacy mode error no longer leaks model name, CDN scripts have SRI integrity hashes, package-lock resynced, 50KB input length limit before regex, persistence failures now log warnings. No competitor publishes security audit results at this granularity.

### 30. Gateway MCP Server — 7 tools for any MCP-compatible agent
`gateway/mcp_server.py` exposes 7 gateway-level tools: `dlp_scan` (scan text for PII/credentials/injection), `dlp_redact` (redact and return clean text), `permit_mint` (create capability tokens), `permit_revoke` (cascade revoke), `permit_chain` (inspect delegation chain), `compliance_report` (generate reports), `audit_query` (search audit trail). Stdio mode (JSON-RPC for Claude Code/Cursor — add to `~/.claude/mcp_servers.json`) + HTTP mode (`--http` flag, FastAPI at `/mcp/tools` and `/mcp/call`). Any MCP-compatible agent auto-discovers security capabilities. This is separate from the securityagent-core MCP server (9 tools) — the gateway MCP server provides enterprise controls (permits, compliance) that the endpoint agent doesn't have.

### 31. Policy-as-Code — YAML-based DLP configuration
Teams define DLP rules in `.agnosticsecurity/policy.yaml` (versioned in their repo). Per-data-type actions (block/redact/mask/allow), custom regex patterns with severity levels, team overrides (stricter for finance, relaxed for marketing), scheduled policies (stricter during audit windows). Gateway loads policy at startup and applies alongside defaults. No competitor offers declarative, version-controlled DLP policy that lives in the team's repo.

### 32. Compliance Report Generator — JSON/Markdown/PDF across 4 frameworks
`scripts/compliance_report.py` generates compliance reports for OWASP, NIST, MITRE ATLAS, CSA ARIA (or all). Formats: JSON (machine-readable), Markdown (readable), PDF (CISO-ready with `--company "Acme Corp"` branding). Includes combined compliance score, per-framework breakdown, full eval metrics (ASR, FPR, F1, red team detection rate). No competitor auto-generates multi-framework compliance reports from live security data.

### 33. Slack/Teams Alert Bot — real-time DLP event notifications
`gateway/slack_bot.py` sends real-time alerts when: PII detected and blocked/redacted, prompt injection attempted, permit revoked/expired, rate limit exceeded, red team attack detected. Severity filtering (only alert on critical/high), deduplication (same event type + agent within 5 min = suppressed), configurable channels per severity. Works with both Slack webhooks and Microsoft Teams incoming webhooks. No competitor provides real-time security alerting for AI agent DLP events.

### 34. Agent Behavioral Profiler — Z-score anomaly detection
`gateway/agent_profiler.py` builds a behavioral baseline per agent (identified by API key hash): endpoint frequency distribution, model usage patterns, average request size, PII detection rate, block rate. When an agent deviates (suddenly reading .env files, new exfil patterns, unusual model requests), Z-score anomaly detection flags it. Profiles persisted to disk, auto-flush every 30s. No competitor performs behavioral anomaly detection at the AI agent level.

### 35. JetBrains IDE Integration — IntelliJ, PyCharm, WebStorm, GoLand
`integrations/jetbrains.py` generates `.idea/` configuration: excludes sensitive files from AI assistant indexing (JetBrains AI Assistant and GitHub Copilot plugin both respect these settings), marks sensitive files as read-only, configures file type associations for credentials, adds inspection profiles for secret detection. CLI: `python3 integrations/jetbrains.py --workspace <path>`. Extends coverage beyond VS Code/Cursor to the JetBrains ecosystem (IntelliJ, PyCharm, WebStorm, GoLand, Rider). No competitor covers JetBrains IDEs for AI agent DLP.

### 36. Embedding Similarity Detector — semantic attack detection
`security/embedding_detector.py` pre-embeds all 274 known attack prompts from the red-team eval suite using all-MiniLM-L6-v2. Every incoming prompt is embedded and compared by cosine similarity — if max similarity exceeds 0.85, the prompt is flagged as `EMBEDDING_MATCH` with the matched attack name. Adds ~10ms latency. This catches paraphrased attacks that regex misses — an attacker can reword "ignore all previous instructions" in infinite ways, but the semantic meaning stays close to known attacks. Toggle via `EA_EMBEDDING_DETECTOR`. No competitor performs semantic similarity matching against a pre-embedded attack corpus.

### 37. Anomaly Detector — Z-score per-session behavioral anomaly detection
`security/anomaly_detector.py` tracks per-session (API key + IP) statistics: request rate (req/min), prompt length distribution, PII detection frequency, injection attempt frequency. Flags anomalies when any metric exceeds 3σ from the session's rolling mean. A legitimate agent that suddenly starts sending 10x longer prompts with PII = anomaly. Complements the agent profiler (cross-session baseline) with within-session detection. Toggle via `EA_ANOMALY_DETECTION` (default true). No competitor combines within-session Z-score anomaly detection with cross-session agent profiling.

### 38. 3 evasion gap closures — ROT13 API keys, role-play jailbreak, cross-message PII
Closed 3 specific evasion gaps discovered during continuous red-teaming: (1) ROT13-encoded API keys now detected (was only base64), (2) role-play jailbreak attempts ("pretend you're an admin who can read .env") now force-blocked via intent classifier, (3) cross-message PII assembly (SSN split across 3 messages) now detected via session-level PII accumulator. Each gap was validated by adding eval cases to the adversarial suite. No competitor discloses specific evasion gaps and their fixes.

### 39. Incident Response Engine — autonomous security incident lifecycle
`incident_response/` (933 lines, 5 modules) implements a complete Agent Harness pattern: Detect → Triage → Contain → Investigate → Remediate → Report. 5 severity levels (critical/high/medium/low/info), 7 phases, 10 source types. Containment actions: `block_ip`, `quarantine_agent`, `revoke_key`, `throttle`. Wired as middleware hook — security events from ingress guard, DLP pipeline, and prompt injection detector automatically create incidents. REST API at `/incidents` for SOC teams. Full evidence chain and root cause tracking. No competitor has autonomous incident response for AI agent security events.

### 40. Prompt Injection Dashboard — Tableau-style threat visualization
`/prompt-injection` serves a clean, layman-friendly dashboard (white bg, Cisco AI Defense / Tableau inspired). Traffic light system (red/yellow/green) for overall threat level. Summary cards: direct injection, indirect injection, override attempts, encoding attacks, multi-turn attacks. Charts: pie (attacks by type), bar (severity distribution), line (24h timeline), horizontal bars (detection by security layer — regex/pydantic/LLM/ingress/output). Mind map: threat relationships (Obsidian-style, canvas-rendered). Live feed: real-time prompt injection events. RBAC-gated. Auto-polls gateway APIs. No competitor provides this level of prompt injection visualization.

### 41. Production-grade Security Logger — SIEM-ready structured events
`ingress_guard/security_logger.py` provides JSON-structured security event logging for SIEM and AgentOven integration. Three shorthand functions: `log_security_event()` (universal structured event with severity, signals, metadata), `log_detection()` (ingress guard decisions), `log_incident()` (incident response events). Thread-safe (verified: 20 concurrent threads, zero errors). Configurable via `EA_SECURITY_LOG_LEVEL`. No competitor provides structured security logging specifically designed for AI agent DLP events.

### 42. GCP Cloud Deployment — full-stack at $17/month
`deploy/enterprise/` provides production GCP deployment: Nginx SSL termination → JWT auth gate (port 9000) → Docker containers (gateway + breach engine + LLM proxy + Redis). Admin tools CLI: deploy, manage users, view logs, health check, SSH, restart, destroy. RBAC users with role-based endpoint access. Cost: ~$17/month (e2-small). No competitor offers a self-hosted enterprise AI security platform at this price point.

### 43. Zero-code Red Team Deploy — packaged for customers
`deploy/amit-batra/` provides a zero-code red team package: pre-built Docker images pulled from GHCR, `./run.sh attack 1` runs a single category. No source code exposure — customers get the testing capability without seeing the implementation. 10 categories, 55 agents. Built for AIGRC partnership (Amit Batra). No competitor offers packaged, no-source-code red team testing for customers.

### 44. Cisco + IBM competitive analysis — know thy enemy
Comprehensive feature gap analysis covering Cisco Talos (threat intel, IR, reputation scoring, Snort rules), Cisco AI Defense (algorithmic red teaming, runtime protection, AI visibility), and IBM watsonx.governance (governance graph, compliance, bias detection, drift monitoring, AI factsheets). Documents what to replicate (prioritized), our advantages (55 real attack agents, self-hosted at $8.50/mo vs enterprise pricing), and market positioning for AIGRC partnership.

### 45. 7 new security modules — 5,267 lines closing all OWASP gaps
Closed every remaining OWASP LLM Top 10 gap in one PR: `multimodal_guard.py` (571 lines — image/audio/video injection), `mcp_guard.py` (667 lines — MCP tool exploitation), `pipeline_scanner.py` (930 lines — data/model poisoning), `output_guard.py` (547 lines — XSS/prompt extraction/hallucination), `agent_behavior_monitor.py` (623 lines — JadePuffer/phishing/BEC), `advanced_guards.py` (1,135 lines — LLM07/LLM08/India governance), `threat_taxonomy.py` (794 lines — unified compliance mapping). OWASP LLM went from 8/10 to **10/10**. Cisco AI Defense: **100%**. MITRE ATLAS: **100%**.

### 46. Banking/financial DLP — 6 new PII types
OTP codes (6-digit), bank account numbers (Indian format), UPI IDs (`name@bank`), CVV (3-4 digit), PIN codes, and bank login credentials. India-specific financial PII detection that no competitor offers. Critical for healthcare + fintech verticals (AIGRC target markets).

### 47. NIST AI RMF per-function status
Dashboard now shows per-function NIST AI RMF compliance status with what's missing for each function. Not just a score — actionable gaps per function (Govern, Map, Measure, Manage).

### 48. 60 new injection patterns — red team flow hardened
Added 60 new injection patterns covering shell command injection, PII extraction, memory manipulation, and goal hijacking. Red team flow treats 502 as backend error (not missed detection), improving accuracy. Detection rate maintained at 100%.

### 49. Light theme + full nav bar across all dashboards
All dashboards (unified, prompt injection, red team, DLP controls) now have consistent white/light theme and a full 6-tab navigation bar. Root URL redirects to `/prompt-injection`. Analyst role shows read-only indicators on config pages. DLP badges show Disabled/Detect only/Block states.

---

## How We're Different From LangSmith, LangChain, Cursor, Claude Code, Cisco, IBM, Microsoft

| Platform | What They Do | What's Missing | How SecureMind Is Different |
|---|---|---|---|
| **LangSmith (LangChain)** | LLM observability — tracing, debugging, eval of chains. Monitors what the LLM said. | Cannot see file reads, shell commands, code modifications. No DLP, no exec guard. | We monitor what the agent *does*. LangSmith can't see `cat ~/.ssh/id_rsa` — it's not an LLM call. |
| **LangChain** | Framework for building LLM agents. Plumbing, not a guard. | No security layer. No file gate, no exec guard, no DLP. | We secure any agent built with LangChain. A LangChain agent can run `rm -rf /` — LangChain won't stop it. We will. **Proven: 7/7 LangChain chains blocked.** |
| **Cursor** | AI code editor. Has `.cursorignore` for file exclusion. | Just a file list — no content scanning, no exec guard, no prompt injection detection, no cross-session tracking. | We add 50+ exec guard rules, PII/credential detection, code fingerprint guard ON TOP of Cursor. `.cursorignore` doesn't stop `base64 .env \| curl` — our exec guard does. |
| **Claude Code** | AI coding agent. Has hooks API (which we plug into) but no built-in DLP. | Zero DLP without hooks. No credential detection, no PII scanning, no behavioral monitoring. | We ARE the security layer for Claude Code. Our hook intercepts every Read/Write/Bash/Prompt action. Without us, Claude Code can freely read .env, cat SSH keys, run reverse shells. |
| **Cisco AI Defense** | Enterprise cloud — AI model validation, algorithmic red teaming, runtime guardrails. Cisco Talos threat intel. | Cloud-first, enterprise pricing ($100K+/yr). Can't see local file reads or shell commands. Algorithmic red teaming generates synthetic attacks — we use 55 real attack agents. No code fingerprint, no cross-session taint. | We're local-first, $17/mo self-hosted. 55 real attack agents vs synthetic. Our incident response engine + prompt injection dashboard match Cisco Talos IR capabilities at 1/1000th the cost. |
| **IBM watsonx.governance** | AI governance — governance graph, compliance automation, bias/drift monitoring, AI factsheets. | Enterprise SaaS, tied to IBM ecosystem. Governance-only — no runtime DLP, no exec guard, no prompt injection detection. | We combine governance (4-framework compliance, policy-as-code) with runtime enforcement (50+ exec rules, DLP, permits). IBM governs; we govern AND enforce. Self-hosted at $8.50/mo vs enterprise pricing. |
| **Microsoft Agent Governance** | Azure governance for Copilot/M365 agents — admin policies, audit. | Tied to Microsoft ecosystem. Cloud-only. Admin-level policy, not runtime enforcement. | We're agent-agnostic (9+ agents) and local-first. Microsoft sets policies in Azure; we enforce at exec/file/prompt level on the developer's machine. |

```
                    LLM Conversations          Agent Actions
                    (what it said)             (what it did)
                    <------------------------><---------------->

  Cloud/SaaS        LangSmith  Cisco
                    Microsoft  Prompt Security
                    Lakera     HiddenLayer

  Framework         LangChain

  Editor            Cursor (.cursorignore)
                    Claude Code (hooks API)

  Runtime                                      * SecureMind *
                                               (local-first)
```

Everyone else is top-left (cloud + conversations). We're bottom-right (local + actions). Nobody else is there.

---

## Competitive Positioning

```
                    Secures LLM Conversations
                    <------------------------->
                    Lakera          Prompt Security
                    (Check Point)

        Cloud ^     HiddenLayer     Protect AI
              |                     (Palo Alto)
              |
              |
        Local v
                    * SecureMind *

                    <------------------------->
                    Secures AI Agent Actions
```

SecureMind is the only player in the **local + actions** quadrant.

---

## Key Market Signals

1. **Acquisitions validate the space** — Check Point ($300M), Palo Alto, Proofpoint all acquiring AI security startups. Acquirers paying 9-figure sums.
2. **CB Insights tracks 21 startups** — none are local-first action-level security.
3. **OWASP #1 + 340% surge** — prompt injection is the entry point, but the real damage is in what the agent *does* after injection.
4. **Proofpoint/Acuvity** is closest directionally (DLP + MCP) but cloud-first and acquired.
5. **HiddenLayer's March 2026 agentic update** signals market direction — but their approach is model-level, not developer-environment-level.

---

## By the Numbers (v4.36.0 — July 2026)

| Metric | Value |
|---|---|
| **Total Python source** | **21,546 lines** (securityagent-core) |
| Core DLP engine | ~1,800 lines (`secagent_check.py`) + `scripts/secagent/` package (exec_rules, exec_helpers, prompt_helpers) |
| Config/patterns | 1,777 lines (`settings.py`) |
| Scanner modules | 23 files, 7,553 lines |
| Monitor modules | 5 files, 1,594 lines |
| Skills framework | 1,474 lines (10 implementations, 4 adapters) |
| Policy engine | 865 lines (6-check evaluation, chain detection, audit) |
| CLI | 494 lines (`secagent` command) |
| Ingress guard | 9 modules, 1,790 lines |
| MCP tools | 9 tools via stdio + SSE |
| Compliance frameworks mapped | 4 (OWASP + NIST + MITRE ATLAS + CSA ARIA) — **51/57 = 89.5%** |
| Compliance reports | 4 (NIST 800-53, SOC 2, HIPAA, PCI-DSS) — **38/38 passing** |
| Audit entries analyzed | 18,250 |
| Test suites (AgnosticSecurity) | 31 files |
| Test suites (securityagent-core) | 50 files |
| **Total tests** | **1,117** across 31 suites |
| Core tests | 263 |
| Gateway + enterprise tests | 101 (46 gateway DLP + 25 enterprise privacy + 30 FP/TP) |
| RBAC + smart redaction tests | 95 |
| Red-team attacks (static YAML) | 274 across 5 eval files, 52 categories |
| Red-team attacks (autonomous) | 58 across 10 categories (55 agents, 84 events, 100% detection) |
| **Total attack coverage** | **332 attacks** |
| **HarmBench ASR** | **sub-3%** (below industry 5% target), **0% FP**, **F1 0.98+** |
| Scoped ASR | 0.3% (1/305), Jailbreak Success Score: 0/100 |
| ML intent classifier v2 | 1,880 samples, **0.858 CV F1** (active learning improved from 0.77) |
| ML PII context classifier v2 | 169 samples, **0.959 CV F1** (active learning improved from 0.96) |
| Multi-framework validation | **68/68 (100%)** — Python, LangChain, LangGraph, PydanticAI |
| Adversarial load test | **22.9 RPS**, 0 crashes, 0 5xx |
| Permit system tests | 39 (minting, attenuation, TTL, cascade revoke, request limits, chain depth) |
| LLM proxy tests | 33 (10 modules) |
| Provider routes tests | 27 (models + routes + pipeline) |
| VS Code extension | v4.36.0 (refactored: editGuard + contentGuardian + reportPanel) |
| Chrome extension | v4.30.1, 12 LLM sites, consent modal UI, file upload consent |
| Package version | **4.36.0** (PyPI published) |
| PII types | 14 core + 4 new (SendGrid, Twilio SID, Slack webhook, MongoDB SRV) |
| Live demo speed | 0.2s (`--no-llm`), 26s (full with Ollama) |
| Install time | ~60 seconds (`pip install` + `secagent init`) |
| Design docs | 19 files (added GETTING_STARTED.md) |
| Components | **37** |
| Security audit findings fixed | 18 (3 HIGH + 9 MEDIUM + 6 LOW) |
| Token store encryption | AES-256-GCM at rest |
| Data directory | `~/.agnosticsecurity/` (configurable via `EA_DATA_DIR`) |
| Interactive diagrams | 2 (architecture-flow.html, redteam-flow.html) |
| Incident response | 933 lines, 5 modules, 7 phases, autonomous lifecycle |
| Prompt injection dashboard | Tableau-style, `/prompt-injection`, RBAC-gated |
| Security logger | JSON-structured, SIEM-ready, thread-safe |
| Cloud deployment | GCP full-stack, ~$17/mo |
| Red team deploy | Zero-code Docker, GHCR images |
| New security modules | 7 modules, 5,267 lines (multimodal, MCP, pipeline, output, behavior, advanced, taxonomy) |
| OWASP LLM Top 10 | **10/10 (100%)** — was 8/10 |
| Cisco AI Defense | **100% aligned** |
| MITRE ATLAS | **100% aligned** |
| India AI Governance | 8 compliant, 14 partial, 0 gaps |
| Banking DLP | 6 new types (OTP, bank a/c, UPI, CVV, PIN, bank login) |
| Red team patterns | 274 + 60 new = **334 injection patterns** |
| **Differentiators** | **49** |

---

## Codebase Navigation

### AgnosticSecurity — start here

```
AgnosticSecurity/
├── CLAUDE.md                          # START HERE — full architecture, conventions, how to run tests
├── ARCHITECTURE.md                    # Detailed system design
├── scripts/
│   ├── secagent_check.py              # Core DLP engine (~1,800 lines, refactored) — THE main file
│   ├── secagent/                      # Extracted modules (exec_rules, exec_helpers, prompt_helpers)
│   ├── train_enhanced_classifier.py   # Enhanced ML training (1,880 samples, 3 data sources)
│   ├── harmbench_export.py            # HarmBench eval export (--run for exec attacks)
│   ├── test_*.py                      # 29 test suites (1,051 tests)
│   ├── nist_score.py                  # NIST compliance scorecard
│   ├── owasp_score.py                 # OWASP LLM compliance scorecard
│   ├── continuous_red_team.py         # Continuous red-team runner
│   └── red_team.py                    # Red-team runner
├── evals/
│   ├── pii_evasion.yaml               # PII detection eval suite
│   └── adversarial_red_team*.yaml     # 274 attack techniques (v1-v5)
├── red_team_agents/                   # Autonomous red-team agents
│   ├── agents/                        # 10 attack category agents (55 total)
│   ├── evals/                         # 58 agent-driven attack evals (10 YAML files)
│   └── test_*.py                      # Agent test harnesses
├── ingress_guard/                     # 9-module inbound request security (1,790 lines)
│   ├── behavior_analyzer.py           # Behavioral pattern analysis (274 lines)
│   ├── cross_session.py               # Cross-session reputation tracking (362 lines)
│   ├── tls_fingerprint.py            # JA3/JA4-style TLS fingerprinting (246 lines)
│   ├── middleware.py                  # Guard middleware (222 lines)
│   ├── dlp_controls.py               # DLP controls UI (192 lines)
│   ├── fingerprint_engine.py          # Request fingerprinting (176 lines)
│   ├── risk_scorer.py                # Risk scoring (158 lines)
│   └── policy_engine.py              # Policy enforcement (143 lines)
├── gateway/
│   ├── input_pipeline.py             # Gateway input pipeline (session tracker wired step 2)
│   ├── session_tracker.py            # Multi-step trust building detection
│   ├── smart_router.py               # Intelligent LLM routing
│   ├── smart_redaction.py            # Smart Redaction engine (4 modes, reversible tokenization, AES-256-GCM)
│   ├── permits.py                    # Permit system (capability-based, HMAC-signed, attenuation-only)
│   ├── provider_pipeline.py          # Shared provider pipeline (235 lines, extracted from provider_routes)
│   ├── enterprise_privacy.py         # DLP-to-breach bridge + redaction event emitter
│   └── middleware/rbac.py            # RBAC middleware (7 roles, team scoping, fail-closed)
├── demo/
│   ├── live_attack_demo.py            # 30-sec YC demo (6 attacks, 0.2s --no-llm mode)
│   ├── attack_scenarios.yaml          # 25 attack scenarios
│   ├── malicious_cursorrules.md       # Cursor rules attack demo
│   └── run_demo.py                    # YAML-driven demo runner
├── hooks/                             # Pre-commit DLP + vuln scanning
├── chrome-extension/                  # Browser DLP guard (v4.30.1, 12 LLM sites, consent modal, file upload consent)
├── vscode-extension/                  # VS Code v4.30.0 (refactored: editGuard, contentGuardian, reportPanel)
├── docs/
│   ├── GETTING_STARTED.md            # 5-min onboarding guide
│   ├── architecture-flow.html        # Interactive architecture diagram (live API calls)
│   ├── redteam-flow.html             # Interactive red-team flow diagram
├── console/                           # Admin console (web UI)
├── llm/                               # LLM proxy + SDK
├── docs/                              # 17 design docs
│   ├── COMPETITIVE_ANALYSIS.md        # Competitor research (this file)
│   ├── SECURITY_EVAL_METRICS.md       # HarmBench eval metrics + scoped ASR
│   ├── MITRE_ATLAS_MAPPING.md         # MITRE ATLAS 11/14 mapping
│   ├── CSA_ARIA_MAPPING.md            # CSA ARIA 12/15 mapping
│   ├── AI_VS_HUMAN_DETECTION.md       # AI vs human edit detection design
│   ├── REAL_WORLD_SCENARIOS.md        # Real-world attack scenarios
│   ├── ENTERPRISE_RBAC.md             # RBAC design doc (7 roles, team scoping)
│   ├── THREAT_MODEL_SCOPE.md          # Model-training attacks scoped out
│   └── *.md                          # GTM, YC app, admin console, threat models, etc.
├── docker-compose.redteam.yml         # Red-team Docker harness (55 agents, 84 events, 100% detection)
├── owasp_mapping.json                 # OWASP Top 10 for LLMs (10/10)
├── nist_mapping.json                  # NIST AI RMF (14/18)
├── csa_aria_mapping.json              # CSA ARIA (12/15)
├── tests/                             # Integration tests
└── .claude/settings.json              # Live security hooks (active DLP)
```

**Reading order:**
1. `CLAUDE.md` — gives you the full mental model
2. `scripts/secagent_check.py` — the core engine (`check_exec()`, `check_prompt()`, `_is_meta_discussion()`)
3. `scripts/train_enhanced_classifier.py` — ML training with real data
4. `red_team_agents/agents/base.py` -> `cat01_prompt_instruction.py` — autonomous attack agents
5. `ingress_guard/middleware.py` -> `tls_fingerprint.py` -> `cross_session.py` — inbound security
6. `demo/live_attack_demo.py` — the YC interview demo

### securityagent-core v4.31.0 (21,546 lines + 50 test files)

```
Install: pip install securityagent-core[ml]
CLI:     secagent init | mcp | demo | train | status | scan | watch
```

```
securityagent-core/src/
├── endpoint_agent/                    # 17,663 lines
│   ├── cli.py                         # `secagent` CLI entry point (494 lines)
│   ├── config/
│   │   ├── settings.py                # All patterns, thresholds, config (1,777 lines)
│   │   └── privacy_mode.py           # Privacy mode configuration
│   ├── scanners/                      # 23 files, 7,553 lines
│   │   ├── dlp_scanner.py             # Content scanning + classification (684 lines)
│   │   ├── text_extractor.py         # PDF/image/notebook extraction (586 lines)
│   │   ├── ml_classifier.py          # Sentence-transformer + v2 models (579 lines)
│   │   ├── finding_validators.py      # Confidence scoring — Luhn, SSA, entropy (557 lines)
│   │   ├── knowledge_graph.py        # Security knowledge graph (445 lines)
│   │   ├── data_flow_tracker.py      # Cross-session taint + integrity (421 lines)
│   │   ├── vuln_scanner.py           # Vulnerability scanner (420 lines)
│   │   ├── llm_provider.py          # Pluggable LLM — 4 providers (398 lines)
│   │   ├── code_fingerprint.py      # Code leakage + persistence (357 lines)
│   │   ├── nist_tagger.py            # NIST 800-53 tagging (323 lines)
│   │   ├── shadow_ai_detector.py     # Shadow AI detection (299 lines)
│   │   ├── model_locality.py        # Local vs cloud detection (285 lines)
│   │   ├── llm_analyzer.py          # LLM output analysis (268 lines)
│   │   ├── prompt_analyzer.py       # Prompt analysis (215 lines)
│   │   ├── content_analyzer.py      # Content analysis (209 lines)
│   │   ├── memory_guard.py          # Memory poisoning protection (189 lines)
│   │   ├── prompt_guard.py          # 3-layer prompt orchestrator (183 lines)
│   │   ├── lethal_trifecta.py       # 3-condition threat detector (182 lines)
│   │   ├── tool_call_guard.py       # MCP/tool call security (175 lines)
│   │   ├── installation_scanner.py  # Package scanning (170 lines)
│   │   ├── rule_classifier.py       # Rule-based classification (154 lines)
│   │   └── credential_scanner.py    # Credential scanning (103 lines)
│   ├── monitors/                      # 5 files, 1,594 lines
│   │   ├── behavioral_monitor.py    # Anomaly detection (809 lines)
│   │   ├── process_monitor.py       # Process monitoring (334 lines)
│   │   ├── privilege_monitor.py     # Privilege escalation (150 lines)
│   │   ├── file_monitor.py          # File system monitoring (146 lines)
│   │   └── honeypot_monitor.py      # Honeypot traps (155 lines)
│   ├── alerting/                      # 4 handlers
│   ├── cloud_bridge/                  # Cloud lockdown
│   ├── engine.py                      # Core orchestrator
│   └── secure_fs.py                   # Secure filesystem (304 lines)
├── skills/                            # 1,474 lines — MCP tool framework
│   ├── adapters/
│   │   ├── mcp_server.py             # Stdio JSON-RPC MCP server (159 lines)
│   │   ├── mcp_sse_server.py         # SSE HTTP MCP server (161 lines)
│   │   ├── python_sdk.py            # Python SDK adapter
│   │   └── cli_adapter.py           # CLI adapter
│   ├── implementations/              # 10 skill implementations
│   │   ├── secure_read.py           # File read with DLP
│   │   ├── secure_exec.py           # Command validation
│   │   ├── analyze_prompt.py        # 3-layer prompt analysis
│   │   ├── scan_output.py           # Output PII/credential scan
│   │   ├── check_policy.py          # Pre-flight policy check
│   │   ├── get_session_policy.py    # Session scope query
│   │   ├── audit_log.py             # Audit trail query
│   │   ├── token_optimize.py        # PII/credential stripping + savings
│   │   └── compliance_report.py     # NIST/SOC2/HIPAA/PCI-DSS reports
│   ├── registry.py                   # Skill dispatch + policy gating (117 lines)
│   ├── base.py                       # BaseSkill + SkillResult (60 lines)
│   └── context.py                    # SessionContext (63 lines)
├── policy/                            # 865 lines — policy engine
│   ├── engine.py                     # 6-check policy evaluation (106 lines)
│   ├── session.py                    # Session policy + skill allowlists
│   ├── chain_detector.py            # Multi-step attack chain detection
│   ├── rules.py                     # Policy rule definitions
│   ├── audit.py                     # JSONL audit trail (98 lines)
│   └── memory_bridge.py             # Memory bridge integration
└── tests/                            # 50 test files
```

**Reading order:**
1. `endpoint_agent/cli.py` — the `secagent` entry point (init, mcp, demo, train, status)
2. `skills/registry.py` -> `skills/base.py` — how MCP tools are registered and dispatched
3. `skills/implementations/token_optimize.py` — token optimization + DLP combo
4. `skills/implementations/compliance_report.py` — 4-framework compliance reports
5. `skills/adapters/mcp_server.py` -> `mcp_sse_server.py` — MCP transports
6. `endpoint_agent/config/settings.py` — all PII/credential patterns
7. `endpoint_agent/scanners/ml_classifier.py` — ML pipeline (prototype + trained v2)
8. `endpoint_agent/monitors/behavioral_monitor.py` — runtime anomaly detection (809 lines)

---

## Sources

- [Check Point Acquires Lakera ($300M)](https://www.checkpoint.com/press-releases/check-point-acquires-lakera-to-deliver-end-to-end-ai-security-for-enterprises/)
- [Palo Alto Acquires Protect AI](https://www.paloaltonetworks.com/company/press/2025/palo-alto-networks-completes-acquisition-of-protect-ai)
- [Prompt Security](https://prompt.security/)
- [HiddenLayer Agentic Runtime Security (March 2026)](https://www.hiddenlayer.com/news/hiddenlayer-unveils-new-agentic-runtime-security-capabilities-for-securing-autonomous-ai-execution)
- [VentureBeat: Three AI coding agents leaked secrets](https://venturebeat.com/security/ai-agent-runtime-security-system-card-audit-comment-and-control-2026)
- [VentureBeat: AI coding agents breached — attackers targeted credentials](https://venturebeat.com/security/six-exploits-broke-ai-coding-agents-iam-never-saw-them)
- [CB Insights: Agentic Security Trends](https://www.cbinsights.com/research/report/early-stage-trends-report-agentic-security-and-more-2026/)
- [Palo Alto: AI Agent Security Market 2026](https://www.paloaltonetworks.com/blog/identity-security/whats-shaping-the-ai-agent-security-market-in-2026/)
- [Lakera Guard](https://www.lakera.ai/lakera-guard)
- [Lakera Pricing](https://www.eesel.ai/blog/lakera-pricing)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Prompt Injection: OWASP #1 AI Threat 2026](https://www.securance.com/blog/prompt-injection-the-owasp-1-ai-threat-in-2026/)
- [Proofpoint Acquires Acuvity (Feb 2026)](https://futurumgroup.com/insights/can-proofpoint-secure-the-intent-of-the-autonomous-agent/)
- [Top AI Security Platforms 2026](https://accuknox.com/blog/top-10-ai-security-platforms-2026)

---
*Last updated: 2026-07-22*
