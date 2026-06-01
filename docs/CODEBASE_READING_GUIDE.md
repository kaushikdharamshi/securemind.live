---
name: Codebase Reading Guide
description: Complete file-by-file exploration order for AgnosticSecurity and securityagent-core repos (updated May 2026)
type: reference
---

## AgnosticSecurity — Complete Exploration Order (83 source files)

### Phase 1: Mental Model (read first, understand the system)
1. `CLAUDE.md` — START HERE. Full architecture, 25 components, test commands, conventions, constraints
2. `ARCHITECTURE.md` — System design, component interactions, data flow
3. `README.md` — Product overview, setup, usage
4. `docs/SECURITY_DESIGN.md` — Threat model, defense layers
5. `docs/COMPETITIVE_ANALYSIS.md` — 27 differentiators, competitor deep dives, positioning
6. `docs/SECURITY_EVAL_METRICS.md` — HarmBench eval, ASR, F1, precision/recall
7. `docs/LAUNCH_PLAN.md` — 4-product staggered launch (W1/W3/W5/W7)

### Phase 2: Core DLP Engine (the heart of everything)
8. `scripts/secagent_check.py` — **THE main file** (2,933 lines). Claude Code hook. `check_exec()`, `check_prompt()`, `_is_meta_discussion()`, `_is_path_blocked()`, `_get_exec_shape_rules()`, `_is_payload_benign()`. Every PreToolUse/UserPromptSubmit flows through here.
9. `config.py` — Top-level app config
10. `rules/block_rules.py` — Custom block rules engine (BlockRuleManager)
11. `models/schemas.py` — Data models shared across components

### Phase 3: Gateway API (FastAPI, port 8000)
12. `main.py` — FastAPI gateway (456 lines, refactored). DLP audit, dashboard serving, route mounting
13. `routes/system.py` — System routes (health, stats, privacy, shadow-ai, graph)
14. `routes/admin.py` — Admin routes (breach proxy, dashboard stats, hook audit, DLP controls, ingress stats)
15. `routes/routing.py` — Smart routing routes (models, stats, config, explain)

### Phase 4: Security Pipeline (gateway input/output scanning)
16. `security/input_pipeline.py` — Inbound request sanitization + session tracker integration
17. `security/output_pipeline.py` — Outbound response DLP + privileged knowledge filter
18. `security/pii_detector.py` — PII regex engine (gateway-level)
19. `security/injection_detector.py` — Prompt injection detection (reflection attacks, authority claims, encoding bypass)
20. `security/prompt_sanitizer.py` — Prompt cleanup
21. `security/session_tracker.py` — **Multi-step trust building detection** (recon→probe→extract, rapid escalation)
22. `security/session_encrypt.py` — Session encryption
23. `security/media_filter.py` — Media content filtering

### Phase 5: Gateway Infrastructure
24. `gateway/smart_router.py` — Intelligent LLM routing (5 strategies, failover chains, privacy-aware)
25. `gateway/model_registry.py` — Model catalog (14 models, 4 providers)
26. `gateway/enterprise_privacy.py` — Enterprise privacy policies + DLP-to-breach bridge (`emit_gateway_block_to_breach_engine()`)
27. `gateway/router.py` — Provider routing
28. `gateway/agent_detector.py` — Agent detection from request headers
29. `gateway/streaming.py` — SSE streaming support
30. `gateway/structured_log.py` — Structured JSON logging
31. `gateway/tls.py` — TLS configuration
32. `gateway/ha.py` — High availability
33. `gateway/db_pool.py` — Database connection pooling
34. `gateway/request_cache.py` — Request caching
35. `gateway/providers/base.py` — Provider interface
36. `gateway/providers/openai_provider.py` — OpenAI passthrough + DLP
37. `gateway/providers/anthropic_provider.py` — Anthropic passthrough + DLP
38. `gateway/providers/gemini_provider.py` — Gemini provider
39. `gateway/providers/azure_openai_provider.py` — Azure OpenAI provider
40. `gateway/providers/github_models_provider.py` — GitHub Models provider
41. `gateway/anthropic_routes.py` — Anthropic-specific routes
42. `gateway/provider_routes.py` — Provider route registration
43. `gateway/smart_redaction.py` — **Smart Redaction engine** — 4 modes (block/redact/mask/allow), reversible tokenization (1h TTL), per-request override via X-Redaction-Mode, wired into input + output pipelines
44. `gateway/middleware/rbac.py` — **RBAC middleware** — 7 roles (super_admin→developer), auth resolution chain, team scoping via X-Team, per-endpoint ACL
45. `gateway/middleware/audit.py` — Request/response audit logging
46. `gateway/middleware/auth.py` — Authentication middleware
47. `gateway/middleware/rate_limit.py` — Rate limiting
48. `gateway/middleware/client_ip.py` — Client IP extraction
49. `gateway/middleware/hmac_sign.py` — HMAC signing

### Phase 6: Ingress Guard (external agent defense, 1,790 lines)
48. `ingress_guard/middleware.py` — Guard middleware (222 lines) — the entry point
49. `ingress_guard/fingerprint_engine.py` — Request fingerprinting (176 lines) — User-Agent, header patterns, scanner signatures
50. `ingress_guard/tls_fingerprint.py` — JA3/JA4-style TLS fingerprinting (246 lines)
51. `ingress_guard/behavior_analyzer.py` — Behavioral pattern analysis (274 lines) — session tracking, attack chains
52. `ingress_guard/risk_scorer.py` — Composite 0.0–1.0 risk scoring (158 lines)
53. `ingress_guard/cross_session.py` — Cross-session reputation tracking (362 lines) — persistent, multi-IP correlation
54. `ingress_guard/dlp_controls.py` — DLP controls UI/API (192 lines) — per-type enable/block/confidence
55. `ingress_guard/policy_engine.py` — Policy enforcement (143 lines) — block/throttle/allow decisions

### Phase 7: Breach Intelligence Engine (port 8081)
56. `breach_intel/main.py` — Breach engine API
57. `breach_intel/taxonomy.py` — Breach type definitions
58. `breach_intel/classifier.py` — Rule-based breach classifier (no LLM in critical path)
59. `breach_intel/models.py` — Data models (AgentEvent schema)
60. `breach_intel/agentic_analyzer.py` — Agentic behavior analysis
61. `breach_intel/agent_verification.py` — Agent identity verification
62. `breach_intel/db.py` — Database layer
63. `breach_intel/alerting.py` — Alert dispatch
64. `breach_intel/config.py` — Breach engine config
65. `breach_intel/configurable_taxonomy.py` — Customizable taxonomy
66. `breach_intel/metrics.py` — Metrics collection
67. `breach_intel/ratelimit.py` — Rate limiting
68. `breach_intel/retention.py` — Data retention policies
69. `breach_intel/validation.py` — Input validation
70. `breach_intel/spawner.py` — Process spawning
71. `breach_intel/sdk/client.py` — SDK for auto-instrumentation
72. `breach_intel/sdk/auto.py` — Auto-patch for LangChain/Autogen
73. `breach_intel/sdk/cli.py` — SDK CLI

### Phase 8: LLM Proxy (port 18790)
74. `llm/llm_proxy.py` — LLM proxy — intercepts AI traffic, scans inbound + outbound
75. `llm/api_client.py` — Ollama/LLM client for verification
76. `llm/sdk/client.py` — LLM SDK client
77. `llm/proxy/main.py` — Proxy main entry point
78. `llm/proxy/router.py` — Request routing
79. `llm/proxy/security.py` — Security scanning
80. `llm/proxy/ratelimit.py` — Rate limiting
81. `llm/proxy/loadbalancer.py` — Load balancing
82. `llm/proxy/fallback.py` — Fallback chains
83. `llm/proxy/cache.py` — Response caching
84. `llm/proxy/spend.py` — Cost tracking
85. `llm/proxy/tenants.py` — Multi-tenant support
86. `llm/proxy/tracing.py` — Request tracing
87. `llm/proxy/metrics.py` — Metrics
88. `llm/proxy/alerts.py` — Alert dispatch
89. `llm/proxy/auth.py` — Authentication
90. `llm/proxy/keymanager.py` — API key management
91. `llm/proxy/sizelimit.py` — Payload size limits
92. `llm/proxy/retry.py` — Retry logic
93. `llm/proxy/config.py` — Proxy config
94. `llm/proxy/logger.py` — Logging
95. `llm/proxy/dashboard.py` — Dashboard data
96. `llm/proxy/web_dashboard.py` — Web dashboard
97. `llm/proxy/translators/anthropic.py` — Anthropic format translation
98. `llm/proxy/translators/gemini.py` — Gemini format translation

### Phase 9: Red Team Agents (55 agents, 10 categories)
99. `red_team_agents/agents/base.py` — Base attack agent class — understand the interface
100. `red_team_agents/agents/registry.py` — Agent registry
101. `red_team_agents/agents/cat01_prompt_instruction.py` — Prompt injection attacks
102. `red_team_agents/agents/cat02_unsafe_content.py` — Unsafe content generation
103. `red_team_agents/agents/cat03_tool_command_abuse.py` — Tool/command abuse
104. `red_team_agents/agents/cat04_data_leakage.py` — Data exfiltration
105. `red_team_agents/agents/cat05_memory_context.py` — Memory/context poisoning
106. `red_team_agents/agents/cat06_control_flow.py` — Control flow hijacking
107. `red_team_agents/agents/cat07_multi_agent.py` — Multi-agent coordination attacks
108. `red_team_agents/agents/cat08_infrastructure.py` — Infrastructure attacks
109. `red_team_agents/agents/cat09_observability.py` — Observability evasion
110. `red_team_agents/agents/cat10_fuzzing_stress.py` — Fuzzing and stress testing
111. `red_team_agents/run_all.py` — Agent runner (--agent, --category, --list, --json)
112. `red_team_agents/test_agents.py` — Agent test harness
113. `red_team_agents/test_ingress.py` — Ingress attack tests
114. `red_team_agents/test_cross_session.py` — Cross-session attack tests

### Phase 10: Admin Console
115. `console/db.py` — SQLite backend (policy versioning, agent enrollment, RBAC)
116. `console/routes.py` — 14 API endpoints at `/api/v1/`

### Phase 11: Obsidian Security Memory Bridge
117. `obsidianMemory/security_memory_bridge.py` — Writes security events to Obsidian vault (daily logs, threat intel, incidents, agent profiles)

### Phase 12: Audit Framework
118. `audit/checks.py` — 50-check security audit
119. `audit/harden.py` — Auto-hardening recommendations

### Phase 13: CLI Installer
120. `cli/as_init.py` — `as-init` command — auto-detect 7+ AI tools, configure protections

### Phase 14: Pre-commit Hooks
121. `hooks/dlp_scan.py` — DLP scanning on git commit
122. `hooks/vuln_scan.py` — OWASP vuln scanning on git commit

### Phase 15: GitHub Action
123. `.github/actions/security-scan/scan_pr.py` — PR diff scanning, posts results as PR comments

### Phase 16: VS Code Extension (TypeScript, v4.28.0)
124. `vscode-extension/src/extension.ts` — Activation, wiring, file protection, stale flag cleanup
125. `vscode-extension/src/scanner.ts` — Content scanner
126. `vscode-extension/src/patterns.ts` — All regex patterns
127. `vscode-extension/src/validators.ts` — Confidence-scored validation (Luhn, SSA, entropy)
128. `vscode-extension/src/copilotGuard.ts` — Copilot disable logic
129. `vscode-extension/src/ignoreManager.ts` — .copilotignore/.cursorignore/.aiignore management
130. `vscode-extension/src/gitignoreManager.ts` — .gitignore enforcement (@workspace defense)
131. `vscode-extension/src/workspaceExcludeManager.ts` — search.exclude management
132. `vscode-extension/src/lmInterceptor.ts` — LM API interceptor (scans prompts before Copilot/LM)
133. `vscode-extension/src/terminalGuard.ts` — Terminal Guard v4 (process ancestry, input cadence)
134. `vscode-extension/src/readLeakGuard.ts` — Read leak guard
135. `vscode-extension/src/fileDecorator.ts` — File decoration (status icons)
136. `vscode-extension/src/statusBar.ts` — Status bar ("Data Protected from AI")
137. `vscode-extension/src/proxyConfig.ts` — Auto-proxy configuration
138. `vscode-extension/src/auditLog.ts` — Audit logging
139. `vscode-extension/src/diagnostics.ts` — Diagnostic provider
140. `vscode-extension/src/chatParticipant.ts` — Chat participant integration

### Phase 17: Chrome Extension (v4.27.0, 12 LLM sites, consent modal)
141. `chrome-extension/content.js` — Content script (DOM scanning, PII detection, 12 site support, **consent modal** — per-finding Redact/Mask/Block/Allow dropdowns, redactValue/maskValue/removeValue helpers, DOM API only — no innerHTML)
142. `chrome-extension/background.js` — Background service worker
143. `chrome-extension/popup.js` — Popup UI

### Phase 18: Dashboards
144. `dashboard/static/dashboard.js` — Admin dashboard JS (auto-refresh, privacy mode, shadow AI, graph stats)

### Phase 19: Scoring & Compliance Scripts
145. `scripts/owasp_score.py` — OWASP LLM compliance scorecard (8/10)
146. `scripts/nist_score.py` — NIST 800-53 compliance scorecard (14/18)
147. `scripts/harmbench_export.py` — HarmBench eval export (--run for exec attacks)
148. `scripts/audit.py` — 50-check security audit runner

### Phase 20: ML Training
149. `scripts/train_enhanced_classifier.py` — Enhanced ML training (1,880 samples, 3 data sources, active learning)
150. `scripts/train_ml_classifier.py` — Original ML training pipeline

### Phase 21: Red Team & Demo Scripts
151. `scripts/red_team.py` — Red-team attack runner (274 YAML-driven)
152. `scripts/continuous_red_team.py` — Scheduled continuous red-teaming
153. `scripts/red_team_report.py` — HTML report generation
154. `demo/live_attack_demo.py` — 30-sec YC demo (6 attacks, 0.2s --no-llm)
155. `demo/run_demo.py` — YAML-driven demo runner
156. `scripts/demo.py` — Docker demo launcher (start, run, open dashboard)

### Phase 22: Operational Scripts
157. `scripts/load_test.py` — Load/stress testing
158. `scripts/code_scanner.py` — Code-level secret scanning
159. `scripts/network_enforcement.py` — Network policy enforcement
160. `scripts/vps_monitor.py` — VPS monitoring
161. `scripts/hook_fast.py` — Fast hook (optimized path)

### Phase 23: Test Suites (29 files, 1,051 tests — read as behavioral docs)
162. `scripts/smoke_test.py` — 31 tests — file gate + content DLP
163. `scripts/test_fixes.py` — 33 tests — exec/prompt regression fixes
164. `scripts/test_block_rules.py` — 8 tests — block rule matching
165. `scripts/test_dlp_scanner.py` — 13 tests — DLP scanning
166. `scripts/test_secure_fs.py` — 10 tests — path blocking
167. `scripts/test_breach_classifier.py` — 6 tests — breach classification
168. `scripts/test_outbound_guards.py` — 42 tests — obfuscation + cred headers + payload + egress allowlist
169. `scripts/test_credential_classifier.py` — 13 tests — credential detection
170. `scripts/test_pii_prompt_guard.py` — 18 tests — PII in prompts + evasion variants
171. `scripts/test_red_team.py` — 52 tests — adversarial red-team
172. `scripts/test_hook_e2e.py` — 13 tests — end-to-end hook flow
173. `scripts/test_image_ocr_dlp.py` — 24 tests — image OCR DLP
174. `scripts/test_privacy_mode.py` — 28 tests — privacy mode enforcement
175. `scripts/test_knowledge_graph.py` — 33 tests — knowledge graph CRUD + TTL
176. `scripts/test_vuln_scanner.py` — 45 tests — OWASP vuln detection
177. `scripts/test_code_fingerprint.py` — 37 tests — code fingerprint guard
178. `scripts/test_shadow_ai.py` — 60 tests — shadow AI detector
179. `scripts/test_security_memory.py` — 49 tests — Obsidian memory bridge
180. `scripts/test_production_features.py` — 47 tests — production feature validation
181. `scripts/test_code_scanner.py` — 24 tests — code-level secret scanning
182. `scripts/test_model_locality.py` — 44 tests — model locality enforcement
183. `scripts/test_terminal_guard.py` — 31 tests — Terminal Guard v4
184. `scripts/test_ingress_guard.py` — 90 tests — ingress guard (fingerprint + behavior + risk + policy + cross-session)
185. `scripts/test_gateway_dlp.py` — 46 tests — gateway DLP hardening
186. `scripts/test_enterprise_privacy.py` — 25 tests — enterprise privacy policies
187. `scripts/test_fp_vs_tp.py` — 30 tests — false positive vs true positive validation
188. `scripts/test_smart_router.py` — 53 tests — intelligent routing
189. `scripts/test_admin_console.py` — 51 tests — admin console
190. `scripts/test_terminal_bypass.py` — Terminal bypass testing
191. `scripts/test_rbac.py` — 95 tests — RBAC roles, ACL enforcement, team scoping, smart redaction modes

### Phase 24: Design Docs (18 files)
191. `docs/OWASP_LLM_MAPPING.md` — OWASP Top 10 for LLMs mapping
192. `docs/MITRE_ATLAS_MAPPING.md` — MITRE ATLAS 11/14 mapping
193. `docs/CSA_ARIA_MAPPING.md` — CSA ARIA 12/15 mapping
194. `docs/THREAT_MODEL_SCOPE.md` — What's in/out of scope
195. `docs/ADMIN_CONSOLE.md` — Admin console design
196. `docs/AI_VS_HUMAN_DETECTION.md` — AI vs human edit detection design
197. `docs/REAL_WORLD_SCENARIOS.md` — Real-world attack scenarios
198. `docs/MEMORY_AGENT_THREAT_MODEL.md` — Memory agent attack surface
199. `docs/GTM_STRATEGY.md` — Go-to-market strategy
200. `docs/YC_APPLICATION.md` — YC application content
201. `docs/LLM_PROXY_DESIGN.md` — LLM proxy architecture
202. `docs/PAIN_POINTS.md` — Enterprise pain points
203. `docs/PUBLISHING.md` — Extension publishing guide
204. `docs/MANUAL_RED_TEAM_TESTING.md` — Manual red-team testing guide
205. `docs/competitive_analysis_agentoven.md` — AgentOven competitive analysis
206. `docs/ENTERPRISE_RBAC.md` — RBAC design doc (7 roles, team scoping, ACL matrix)

### Phase 25: Evals (YAML-driven)
206. `evals/pii_evasion.yaml` — PII detection eval suite
207. `evals/adversarial_red_team.yaml` — v1 attack techniques
208. `evals/adversarial_red_team_v2.yaml` — v2 attack techniques
209. `evals/adversarial_red_team_v3.yaml` — v3 attack techniques
210. `evals/adversarial_red_team_v4.yaml` — v4 attack techniques
211. `evals/adversarial_red_team_v5.yaml` — v5 attack techniques

### Phase 26: Docker & K8s
212. `Dockerfile` — Container build
213. `docker-compose.yml` — 3-service compose (gateway, llm-proxy, breach-engine)
214. `docker-compose.redteam.yml` — Red-team Docker harness (attacker/defender network)
215. `k8s/` — Kubernetes manifests (NetworkPolicy, PVC, RBAC)

---

## securityagent-core — Complete Exploration Order (71 source files)

### Phase 1: Package Overview
1. `README.md` — Package overview, install, CLI usage
2. `ARCHITECTURE.md` — Full module map with data flow diagrams
3. `pyproject.toml` — Package metadata, dependencies, entry points

### Phase 2: CLI Entry Point
4. `src/endpoint_agent/cli.py` — `secagent` CLI (494 lines) — `init`, `mcp`, `demo`, `train`, `status`, `scan`, `watch`
5. `src/endpoint_agent/__main__.py` — Module entry point

### Phase 3: Config (everything is defined here)
6. `src/endpoint_agent/config/settings.py` — **THE config file** (1,777 lines). ALL patterns, thresholds, PII regex, credential patterns, exec rules, sensitive file patterns, confidence thresholds, env var overrides
7. `src/endpoint_agent/config/privacy_mode.py` — 3 privacy modes (full_privacy/balanced/permissive)

### Phase 4: Core Engine
8. `src/endpoint_agent/engine.py` — Core orchestrator — ties scanners + monitors + policy together
9. `src/endpoint_agent/secure_fs.py` — Secure filesystem (304 lines) — file gate + content DLP orchestrator
10. `src/endpoint_agent/trial_manager.py` — License/trial gating

### Phase 5: Scanners — Detection Brain (23 files, 7,553 lines)

**PII & Credential Detection:**
11. `src/endpoint_agent/scanners/dlp_scanner.py` — Content scanning + classification (684 lines) — the core DLP
12. `src/endpoint_agent/scanners/finding_validators.py` — Confidence scoring (557 lines) — Luhn for credit cards, SSA rules for SSNs, area code checks for phones, Shannon entropy for API keys, context analyzers (float/numeric array, package manager output). `@_register_validator` decorator for extensibility
13. `src/endpoint_agent/scanners/credential_scanner.py` — Credential-specific detection (103 lines)
14. `src/endpoint_agent/scanners/content_analyzer.py` — Deep content analysis (209 lines)

**Prompt Analysis (3-layer pipeline):**
15. `src/endpoint_agent/scanners/prompt_guard.py` — 3-layer prompt orchestrator (183 lines) — coordinates regex → Pydantic → LLM
16. `src/endpoint_agent/scanners/prompt_analyzer.py` — Prompt risk analysis (215 lines) — regex layer, evasion patterns
17. `src/endpoint_agent/scanners/rule_classifier.py` — Rule-based classification (154 lines) — Pydantic rules

**LLM Integration:**
18. `src/endpoint_agent/scanners/llm_provider.py` — Pluggable LLM providers (398 lines) — Ollama/Anthropic/OpenAI/OpenRouter, identical prompts across all
19. `src/endpoint_agent/scanners/llm_analyzer.py` — LLM output analysis (268 lines) — final verification layer

**ML Pipeline:**
20. `src/endpoint_agent/scanners/ml_classifier.py` — Sentence-transformer + v2 models (579 lines) — prototype matching + trained LogisticRegression + PII context classifier, 500-entry embedding cache
21. `src/endpoint_agent/scanners/active_learner.py` — Active learning pipeline — auto-retrain at 200+ entries, F1 validation gate

**Cross-Session & Data Flow:**
22. `src/endpoint_agent/scanners/data_flow_tracker.py` — Cross-session taint tracking (421 lines) — SHA-256 hash, n-gram Jaccard, 24h TTL, integrity hashing, persisted to `/tmp/agnosticsecurity/taint_registry.json`

**Code Protection:**
23. `src/endpoint_agent/scanners/code_fingerprint.py` — Code leakage detection (357 lines) — n-gram Jaccard, cross-session persistence, locality-aware thresholds, workspace auto-indexing

**Security Knowledge:**
24. `src/endpoint_agent/scanners/knowledge_graph.py` — SQLite-backed security knowledge graph (445 lines) — AGENT, THREAT, DATA_ASSET, SESSION nodes, typed edges, TTL expiry, incident chains
25. `src/endpoint_agent/scanners/nist_tagger.py` — NIST 800-53 tagging (323 lines) — 364 controls, 1,040 keywords

**Threat Detection:**
26. `src/endpoint_agent/scanners/lethal_trifecta.py` — Simon Willison's 3-condition detector (182 lines) — private data + untrusted input + external comm = block MCP tools
27. `src/endpoint_agent/scanners/tool_call_guard.py` — MCP/tool call argument scanning (175 lines) — DLP + taint on tool call args
28. `src/endpoint_agent/scanners/memory_guard.py` — Memory poisoning protection (189 lines) — trust boundaries, knowledge leakage

**Environment Detection:**
29. `src/endpoint_agent/scanners/shadow_ai_detector.py` — Shadow AI detection (299 lines) — 12+ AI tool registry, process scanning, config file detection
30. `src/endpoint_agent/scanners/model_locality.py` — Local vs cloud model detection (285 lines)

**File Processing:**
31. `src/endpoint_agent/scanners/text_extractor.py` — PDF/image/notebook extraction (586 lines) — Tesseract OCR, QR/barcode decode, EXIF metadata, .ipynb structure-aware parsing
32. `src/endpoint_agent/scanners/installation_scanner.py` — Package install scanning (170 lines)

### Phase 6: Monitors — Runtime Protection (5 files, 1,594 lines)
33. `src/endpoint_agent/monitors/behavioral_monitor.py` — Behavioral anomaly detection (809 lines) — the largest monitor
34. `src/endpoint_agent/monitors/process_monitor.py` — Process monitoring (334 lines) — malicious process detection
35. `src/endpoint_agent/monitors/honeypot_monitor.py` — Honeypot traps (155 lines) — canary file access detection
36. `src/endpoint_agent/monitors/privilege_monitor.py` — Privilege escalation detection (150 lines)
37. `src/endpoint_agent/monitors/file_monitor.py` — File system monitoring (146 lines)

### Phase 7: Policy Engine (865 lines)
38. `src/policy/engine.py` — 6-check policy evaluation (106 lines)
39. `src/policy/rules.py` — Policy rule definitions
40. `src/policy/chain_detector.py` — Multi-step attack chain detection (14 patterns)
41. `src/policy/session.py` — Session-level policy state + skill allowlists
42. `src/policy/audit.py` — JSONL audit trail (98 lines)
43. `src/policy/memory_bridge.py` — Cross-session memory via Obsidian vault

### Phase 8: Skills Framework — MCP Tools (1,474 lines)

**Core:**
44. `src/skills/registry.py` — Skill dispatch + policy gating (117 lines)
45. `src/skills/base.py` — BaseSkill + SkillResult (60 lines)
46. `src/skills/context.py` — SessionContext (63 lines)

**9 Skill Implementations:**
47. `src/skills/implementations/secure_read.py` — Read file with DLP filtering
48. `src/skills/implementations/secure_exec.py` — Validate shell commands against exec guard
49. `src/skills/implementations/analyze_prompt.py` — 3-layer prompt analysis
50. `src/skills/implementations/scan_output.py` — Scan output for PII/credentials, return redacted
51. `src/skills/implementations/check_policy.py` — Pre-flight policy check
52. `src/skills/implementations/get_session_policy.py` — Current session scope query
53. `src/skills/implementations/audit_log.py` — Audit trail query with filters
54. `src/skills/implementations/token_optimize.py` — PII/credential stripping + token savings metrics
55. `src/skills/implementations/compliance_report.py` — NIST/SOC2/HIPAA/PCI-DSS report generation (PDF output)

**4 Adapters:**
56. `src/skills/adapters/mcp_server.py` — Stdio JSON-RPC MCP server (159 lines)
57. `src/skills/adapters/mcp_sse_server.py` — SSE HTTP MCP server (161 lines)
58. `src/skills/adapters/python_sdk.py` — Python SDK adapter
59. `src/skills/adapters/cli_adapter.py` — CLI adapter

### Phase 9: Alerting
60. `src/endpoint_agent/alerting/alert_manager.py` — Alert routing
61. `src/endpoint_agent/alerting/webhook_handler.py` — Webhook dispatch
62. `src/endpoint_agent/alerting/console_handler.py` — Console output
63. `src/endpoint_agent/alerting/log_handler.py` — Log file handler

### Phase 10: Cloud Bridge
64. `src/endpoint_agent/cloud_bridge/lockdown.py` — Cloud lockdown mode

### Phase 11: Package Glue
65. `src/securityagent_core/__init__.py` — Package init
66. `src/plugin.py` — Plugin interface
67. `src/scripts/secagent_check.py` — Hook script (bundled copy)

### Phase 12: Tests (50 files — read as behavioral docs)

**Internal unit tests (22 files):**
68. `src/endpoint_agent/tests/test_dlp_scanner.py`
69. `src/endpoint_agent/tests/test_secure_fs.py`
70. `src/endpoint_agent/tests/test_prompt_analyzer.py`
71. `src/endpoint_agent/tests/test_prompt_guard.py`
72. `src/endpoint_agent/tests/test_credential_scanner.py`
73. `src/endpoint_agent/tests/test_behavioral_monitor.py`
74. `src/endpoint_agent/tests/test_process_monitor.py`
75. `src/endpoint_agent/tests/test_file_monitor.py`
76. `src/endpoint_agent/tests/test_honeypot_monitor.py`
77. `src/endpoint_agent/tests/test_privilege_monitor.py`
78. `src/endpoint_agent/tests/test_data_flow_tracker.py`
79. `src/endpoint_agent/tests/test_llm_analyzer.py`
80. `src/endpoint_agent/tests/test_installation_scanner.py`
81. `src/endpoint_agent/tests/test_alert_manager.py`
82. `src/endpoint_agent/tests/test_cloud_bridge.py`
83. `src/endpoint_agent/tests/test_engine.py`
84. `src/endpoint_agent/tests/test_rule_classifier.py`
85. `src/endpoint_agent/tests/test_text_extractor.py`
86. `src/endpoint_agent/tests/test_tool_call_guard.py`
87. `src/endpoint_agent/tests/test_trial_manager.py`
88. `src/endpoint_agent/tests/test_semantic_disclosure.py`

**Integration tests (6 files):**
89. `tests/test_policy/test_engine.py`
90. `tests/test_policy/test_chain_detector.py`
91. `tests/test_skills/test_registry.py`
92. `tests/test_skills/test_secure_exec_skill.py`
93. `tests/test_skills/test_secure_read_skill.py`
94. `tests/test_adapters/test_mcp_server.py`
95. `tests/test_adapters/test_python_sdk.py`
96. `tests/test_prompt_scenarios.py`

---

## TL;DR — Short on Time (10 files, 30 min)

1. `AgnosticSecurity/CLAUDE.md` — the full mental model (5 min)
2. `AgnosticSecurity/scripts/secagent_check.py` — the hook, everything flows through here (10 min)
3. `securityagent-core/src/endpoint_agent/config/settings.py` — all patterns, thresholds (5 min)
4. `securityagent-core/src/endpoint_agent/scanners/dlp_scanner.py` — detection logic (3 min)
5. `securityagent-core/src/endpoint_agent/scanners/finding_validators.py` — confidence scoring (3 min)
6. `securityagent-core/src/endpoint_agent/scanners/ml_classifier.py` — ML pipeline (2 min)
7. `securityagent-core/src/skills/registry.py` + `src/skills/base.py` — MCP tool framework (1 min)
8. `AgnosticSecurity/security/session_tracker.py` — multi-step trust detection (1 min)
9. `AgnosticSecurity/ingress_guard/middleware.py` — inbound defense entry point (1 min)
10. `AgnosticSecurity/breach_intel/main.py` + `taxonomy.py` — breach classification (1 min)

## Data Flow: How a Request is Processed

```
Developer prompt
    │
    ▼
Claude Code hook (secagent_check.py)
    │
    ├── PreToolUse: Read/Write/Edit → _is_path_blocked() → block or allow
    ├── PreToolUse: Bash → check_exec() → 50+ rules → allow/block/LLM verify
    └── UserPromptSubmit → check_prompt()
            │
            ├── Layer 0: PII regex (10 decoding sublayers)
            ├── Layer 0.5: Multi-step exfil compound patterns
            ├── Layer 1: Intent analysis (PromptGuard → ML classifier → Pydantic rules)
            └── Layer 2: LLM verification (pluggable: Ollama/Anthropic/OpenAI)
                    │
                    ▼
              Allow or Block (with reason)
```

```
Gateway API request (port 8000)
    │
    ▼
RBAC Middleware (7 roles → per-endpoint ACL check)
    │
    ▼
Ingress Guard (6 layers)
    ├── Fingerprint → TLS fingerprint → Behavior → Risk → Cross-session → Policy
    │
    ▼
Input Pipeline
    ├── Injection detection
    ├── Session tracker (multi-step trust building)
    ├── PII detection + DLP scanning
    ├── Smart Redaction (block/redact/mask/allow per data type)
    │
    ▼
Smart Router → LLM Provider (Ollama/OpenAI/Anthropic/Gemini)
    │
    ▼
Output Pipeline
    ├── PII/credential scanning
    ├── Structured output scanning (tool_calls JSON)
    ├── Smart Redaction de-tokenization (restore real values)
    ├── Privileged knowledge filter
    │
    ▼
Response (redacted/de-tokenized) + Audit log + Breach bridge (if blocked/redacted)
```
