// Generated from /home/nguyenvandoanh/Documents/9router/open-sse/config/providerModels.js
// Do not edit by hand; regenerate when syncing 9router model metadata.

export interface NineRouterModelCatalogEntry {
  providerId: string;
  providerAlias: string;
  id: string;
  displayName: string;
  kind: string;
  contextWindow?: number;
  capabilities?: string[];
  targetFormat?: string;
  upstreamModelId?: string;
  quotaFamily?: string;
  dimensions?: number;
}

export const NINE_ROUTER_PROVIDER_ALIASES = {
  "agentrouter": "agentrouter",
  "ai21": "ai21",
  "aimlapi": "aimlapi",
  "alicode": "alicode",
  "alicode-intl": "alicode-intl",
  "anthropic": "anthropic",
  "antigravity": "ag",
  "assemblyai": "assemblyai",
  "azure": "azure",
  "baseten": "baseten",
  "bazaarlink": "bazaarlink",
  "blackbox": "blackbox",
  "byteplus": "byteplus",
  "bytez": "bytez",
  "cerebras": "cerebras",
  "chutes": "chutes",
  "claude": "cc",
  "cline": "cl",
  "cloudflare-ai": "cloudflare-ai",
  "codebuddy": "codebuddy",
  "codex": "cx",
  "cohere": "cohere",
  "commandcode": "commandcode",
  "completions": "completions",
  "cursor": "cu",
  "deepgram": "deepgram",
  "deepinfra": "deepinfra",
  "deepseek": "deepseek",
  "enally": "enally",
  "fireworks": "fireworks",
  "freetheai": "freetheai",
  "gemini": "gemini",
  "gemini-cli": "gc",
  "github": "gh",
  "gitlab": "gitlab",
  "glhf": "glhf",
  "glm": "glm",
  "glm-cn": "glm-cn",
  "grok-web": "grok-web",
  "groq": "groq",
  "hyperbolic": "hyperbolic",
  "iflow": "if",
  "inference-net": "inference-net",
  "kilocode": "kc",
  "kimi": "kimi",
  "kimi-coding": "kmc",
  "kiro": "kr",
  "kluster": "kluster",
  "lepton": "lepton",
  "llm7": "llm7",
  "longcat": "longcat",
  "minimax": "minimax",
  "minimax-cn": "minimax-cn",
  "mistral": "mistral",
  "modal": "modal",
  "morph": "morph",
  "nanobanana": "nanobanana",
  "nebius": "nebius",
  "nlpcloud": "nlpcloud",
  "nous-research": "nous-research",
  "novita": "novita",
  "nscale": "nscale",
  "nvidia": "nvidia",
  "ollama": "ollama",
  "ollama-local": "ollama-local",
  "openai": "openai",
  "opencode": "oc",
  "opencode-go": "opencode-go",
  "openrouter": "openrouter",
  "perplexity": "perplexity",
  "perplexity-web": "perplexity-web",
  "predibase": "predibase",
  "publicai": "publicai",
  "puter": "puter",
  "qoder": "qoder",
  "qwen": "qw",
  "reka": "reka",
  "sambanova": "sambanova",
  "scaleway": "scaleway",
  "siliconflow": "siliconflow",
  "together": "together",
  "uncloseai": "uncloseai",
  "vercel-ai-gateway": "vercel-ai-gateway",
  "vertex": "vertex",
  "vertex-partner": "vertex-partner",
  "volcengine-ark": "volcengine-ark",
  "xai": "xai",
  "xiaomi-mimo": "xiaomi-mimo",
  "xiaomi-tokenplan": "xiaomi-tokenplan"
} as const;

export const NINE_ROUTER_MODEL_CATALOG: NineRouterModelCatalogEntry[] = [
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-opus-4-7",
    "displayName": "Claude Opus 4.7",
    "kind": "llm"
  },
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-opus-4-6",
    "displayName": "Claude Opus 4.6",
    "kind": "llm"
  },
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-sonnet-4-6",
    "displayName": "Claude Sonnet 4.6",
    "kind": "llm"
  },
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-opus-4-5-20251101",
    "displayName": "Claude 4.5 Opus",
    "kind": "llm"
  },
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-sonnet-4-5-20250929",
    "displayName": "Claude 4.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "claude",
    "providerAlias": "cc",
    "id": "claude-haiku-4-5-20251001",
    "displayName": "Claude 4.5 Haiku",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.5",
    "displayName": "GPT 5.5",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.5-review",
    "displayName": "GPT 5.5 Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.5",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.4",
    "displayName": "GPT 5.4",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.4-review",
    "displayName": "GPT 5.4 Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.4",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex",
    "displayName": "GPT 5.3 Codex",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-review",
    "displayName": "GPT 5.3 Codex Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-xhigh",
    "displayName": "GPT 5.3 Codex (xHigh)",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-xhigh-review",
    "displayName": "GPT 5.3 Codex (xHigh) Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex-xhigh",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-high",
    "displayName": "GPT 5.3 Codex (High)",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-high-review",
    "displayName": "GPT 5.3 Codex (High) Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex-high",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-low",
    "displayName": "GPT 5.3 Codex (Low)",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-low-review",
    "displayName": "GPT 5.3 Codex (Low) Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex-low",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-none",
    "displayName": "GPT 5.3 Codex (None)",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-none-review",
    "displayName": "GPT 5.3 Codex (None) Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex-none",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-spark",
    "displayName": "GPT 5.3 Codex Spark",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-codex-spark-review",
    "displayName": "GPT 5.3 Codex Spark Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.3-codex-spark",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-mini",
    "displayName": "GPT 5.1 Codex Mini",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-mini-review",
    "displayName": "GPT 5.1 Codex Mini Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.1-codex-mini",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-mini-high",
    "displayName": "GPT 5.1 Codex Mini (High)",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-mini-high-review",
    "displayName": "GPT 5.1 Codex Mini (High) Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.1-codex-mini-high",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.2-codex",
    "displayName": "GPT 5.2 Codex",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.2-codex-review",
    "displayName": "GPT 5.2 Codex Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.2-codex",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.2",
    "displayName": "GPT 5.2",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.2-review",
    "displayName": "GPT 5.2 Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.2",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-max",
    "displayName": "GPT 5.1 Codex Max",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-max-review",
    "displayName": "GPT 5.1 Codex Max Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.1-codex-max",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex",
    "displayName": "GPT 5.1 Codex",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-codex-review",
    "displayName": "GPT 5.1 Codex Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.1-codex",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1",
    "displayName": "GPT 5.1",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.1-review",
    "displayName": "GPT 5.1 Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5.1",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5-codex",
    "displayName": "GPT 5 Codex",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5-codex-review",
    "displayName": "GPT 5 Codex Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5-codex",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5-codex-mini",
    "displayName": "GPT 5 Codex Mini",
    "kind": "llm"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5-codex-mini-review",
    "displayName": "GPT 5 Codex Mini Review",
    "kind": "llm",
    "upstreamModelId": "gpt-5-codex-mini",
    "quotaFamily": "review"
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.5-image",
    "displayName": "GPT 5.5 Image",
    "kind": "image",
    "capabilities": [
      "text2img",
      "edit"
    ]
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.4-image",
    "displayName": "GPT 5.4 Image",
    "kind": "image",
    "capabilities": [
      "text2img",
      "edit"
    ]
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.3-image",
    "displayName": "GPT 5.3 Image",
    "kind": "image",
    "capabilities": [
      "text2img",
      "edit"
    ]
  },
  {
    "providerId": "codex",
    "providerAlias": "cx",
    "id": "gpt-5.2-image",
    "displayName": "GPT 5.2 Image",
    "kind": "image",
    "capabilities": [
      "text2img",
      "edit"
    ]
  },
  {
    "providerId": "gemini-cli",
    "providerAlias": "gc",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash Preview",
    "kind": "llm"
  },
  {
    "providerId": "gemini-cli",
    "providerAlias": "gc",
    "id": "gemini-3-pro-preview",
    "displayName": "Gemini 3 Pro Preview",
    "kind": "llm"
  },
  {
    "providerId": "qwen",
    "providerAlias": "qw",
    "id": "qwen3-coder-plus",
    "displayName": "Qwen3 Coder Plus",
    "kind": "llm"
  },
  {
    "providerId": "qwen",
    "providerAlias": "qw",
    "id": "qwen3-coder-flash",
    "displayName": "Qwen3 Coder Flash",
    "kind": "llm"
  },
  {
    "providerId": "qwen",
    "providerAlias": "qw",
    "id": "vision-model",
    "displayName": "Qwen3 Vision Model",
    "kind": "llm"
  },
  {
    "providerId": "qwen",
    "providerAlias": "qw",
    "id": "coder-model",
    "displayName": "Qwen3.6 Coder Model",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-coder-plus",
    "displayName": "Qwen3 Coder Plus",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-max",
    "displayName": "Qwen3 Max",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-vl-plus",
    "displayName": "Qwen3 VL Plus",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-max-preview",
    "displayName": "Qwen3 Max Preview",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-235b",
    "displayName": "Qwen3 235B A22B",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-235b-a22b-instruct",
    "displayName": "Qwen3 235B A22B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-235b-a22b-thinking-2507",
    "displayName": "Qwen3 235B A22B Thinking",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "qwen3-32b",
    "displayName": "Qwen3 32B",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "kimi-k2",
    "displayName": "Kimi K2",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "deepseek-v3.2",
    "displayName": "DeepSeek V3.2 Exp",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "deepseek-v3.1",
    "displayName": "DeepSeek V3.1 Terminus",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "deepseek-v3",
    "displayName": "DeepSeek V3 671B",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "deepseek-r1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "glm-4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "iflow",
    "providerAlias": "if",
    "id": "iflow-rome-30ba3b",
    "displayName": "iFlow ROME",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "gemini-3.1-pro-high",
    "displayName": "Gemini 3 Pro High",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "gemini-3.1-pro-low",
    "displayName": "Gemini 3 Pro Low",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "gemini-3-flash",
    "displayName": "Gemini 3 Flash",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "claude-sonnet-4-6",
    "displayName": "Claude Sonnet 4.6",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "claude-opus-4-6-thinking",
    "displayName": "Claude Opus 4.6 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "antigravity",
    "providerAlias": "ag",
    "id": "gpt-oss-120b-medium",
    "displayName": "GPT OSS 120B Medium",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-3.5-turbo",
    "displayName": "GPT-3.5 Turbo",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-4",
    "displayName": "GPT-4",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o mini",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-4.1",
    "displayName": "GPT-4.1",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5-mini",
    "displayName": "GPT-5 Mini",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5.2",
    "displayName": "GPT-5.2",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5.2-codex",
    "displayName": "GPT-5.2 Codex",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5.3-codex",
    "displayName": "GPT-5.3 Codex",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5.4",
    "displayName": "GPT-5.4",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gpt-5.4-mini",
    "displayName": "GPT-5.4 Mini",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-haiku-4.5",
    "displayName": "Claude Haiku 4.5",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-opus-4.5",
    "displayName": "Claude Opus 4.5",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-sonnet-4",
    "displayName": "Claude Sonnet 4",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-sonnet-4.5",
    "displayName": "Claude Sonnet 4.5",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-sonnet-4.6",
    "displayName": "Claude Sonnet 4.6",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-opus-4.6",
    "displayName": "Claude Opus 4.6",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "claude-opus-4.7",
    "displayName": "Claude Opus 4.7",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gemini-2.5-pro",
    "displayName": "Gemini 2.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "gemini-3.1-pro-preview",
    "displayName": "Gemini 3.1 Pro",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "grok-code-fast-1",
    "displayName": "Grok Code Fast 1",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "oswe-vscode-prime",
    "displayName": "Raptor Mini",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "goldeneye-free-auto",
    "displayName": "GoldenEye",
    "kind": "llm"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "text-embedding-3-small",
    "displayName": "Text Embedding 3 Small (GitHub)",
    "kind": "embedding"
  },
  {
    "providerId": "github",
    "providerAlias": "gh",
    "id": "text-embedding-3-large",
    "displayName": "Text Embedding 3 Large (GitHub)",
    "kind": "embedding"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-sonnet-4.5",
    "displayName": "Claude Sonnet 4.5",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-haiku-4.5",
    "displayName": "Claude Haiku 4.5",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "deepseek-3.2",
    "displayName": "DeepSeek 3.2",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "qwen3-coder-next",
    "displayName": "Qwen3 Coder Next",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-sonnet-4.5-thinking",
    "displayName": "Claude Sonnet 4.5 (Thinking)",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-haiku-4.5-thinking",
    "displayName": "Claude Haiku 4.5 (Thinking)",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-sonnet-4.5-agentic",
    "displayName": "Claude Sonnet 4.5 (Agentic)",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-haiku-4.5-agentic",
    "displayName": "Claude Haiku 4.5 (Agentic)",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-sonnet-4.5-thinking-agentic",
    "displayName": "Claude Sonnet 4.5 (Thinking + Agentic)",
    "kind": "llm"
  },
  {
    "providerId": "kiro",
    "providerAlias": "kr",
    "id": "claude-haiku-4.5-thinking-agentic",
    "displayName": "Claude Haiku 4.5 (Thinking + Agentic)",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "default",
    "displayName": "Auto (Server Picks)",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-opus-high-thinking",
    "displayName": "Claude 4.5 Opus High Thinking",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-opus-high",
    "displayName": "Claude 4.5 Opus High",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-sonnet-thinking",
    "displayName": "Claude 4.5 Sonnet Thinking",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-sonnet",
    "displayName": "Claude 4.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-haiku",
    "displayName": "Claude 4.5 Haiku",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.5-opus",
    "displayName": "Claude 4.5 Opus",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "gpt-5.2-codex",
    "displayName": "GPT 5.2 Codex",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.6-opus-max",
    "displayName": "Claude 4.6 Opus Max",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "claude-4.6-sonnet-medium-thinking",
    "displayName": "Claude 4.6 Sonnet Medium Thinking",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash Preview",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "gpt-5.2",
    "displayName": "GPT 5.2",
    "kind": "llm"
  },
  {
    "providerId": "cursor",
    "providerAlias": "cu",
    "id": "gpt-5.3-codex",
    "displayName": "GPT 5.3 Codex",
    "kind": "llm"
  },
  {
    "providerId": "kimi-coding",
    "providerAlias": "kmc",
    "id": "kimi-k2.6",
    "displayName": "Kimi K2.6",
    "kind": "llm"
  },
  {
    "providerId": "kimi-coding",
    "providerAlias": "kmc",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "kimi-coding",
    "providerAlias": "kmc",
    "id": "kimi-k2.5-thinking",
    "displayName": "Kimi K2.5 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "kimi-coding",
    "providerAlias": "kmc",
    "id": "kimi-latest",
    "displayName": "Kimi Latest",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "anthropic/claude-sonnet-4-20250514",
    "displayName": "Claude Sonnet 4",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "anthropic/claude-opus-4-20250514",
    "displayName": "Claude Opus 4",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "google/gemini-2.5-pro",
    "displayName": "Gemini 2.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "google/gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "openai/gpt-4.1",
    "displayName": "GPT-4.1",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "openai/o3",
    "displayName": "o3",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "deepseek/deepseek-chat",
    "displayName": "DeepSeek Chat",
    "kind": "llm"
  },
  {
    "providerId": "kilocode",
    "providerAlias": "kc",
    "id": "deepseek/deepseek-reasoner",
    "displayName": "DeepSeek Reasoner",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "kimi-k2.6",
    "displayName": "Kimi K2.6",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "glm-5.1",
    "displayName": "GLM 5.1",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "qwen3.5-plus",
    "displayName": "Qwen 3.5 Plus",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "qwen3.6-plus",
    "displayName": "Qwen 3.6 Plus",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "mimo-v2-pro",
    "displayName": "MiMo V2 Pro",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "mimo-v2-omni",
    "displayName": "MiMo V2 Omni",
    "kind": "llm"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "minimax-m2.7",
    "displayName": "MiniMax M2.7",
    "kind": "llm",
    "targetFormat": "claude"
  },
  {
    "providerId": "opencode-go",
    "providerAlias": "opencode-go",
    "id": "minimax-m2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm",
    "targetFormat": "claude"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "anthropic/claude-opus-4.7",
    "displayName": "Claude Opus 4.7",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "anthropic/claude-sonnet-4.6",
    "displayName": "Claude Sonnet 4.6",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "anthropic/claude-opus-4.6",
    "displayName": "Claude Opus 4.6",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "openai/gpt-5.3-codex",
    "displayName": "GPT-5.3 Codex",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "openai/gpt-5.4",
    "displayName": "GPT-5.4",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "google/gemini-3.1-pro-preview",
    "displayName": "Gemini 3.1 Pro Preview",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "google/gemini-3.1-flash-lite-preview",
    "displayName": "Gemini 3.1 Flash Lite Preview",
    "kind": "llm"
  },
  {
    "providerId": "cline",
    "providerAlias": "cl",
    "id": "kwaipilot/kat-coder-pro",
    "displayName": "KAT Coder Pro",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5.4",
    "displayName": "GPT-5.4",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5.4-mini",
    "displayName": "GPT-5.4 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5.4-nano",
    "displayName": "GPT-5.4 Nano",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5.2",
    "displayName": "GPT-5.2",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5.1",
    "displayName": "GPT-5.1",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5",
    "displayName": "GPT-5",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5-mini",
    "displayName": "GPT-5 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-5-nano",
    "displayName": "GPT-5 Nano",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4-turbo",
    "displayName": "GPT-4 Turbo",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4.1",
    "displayName": "GPT-4.1",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4.1-mini",
    "displayName": "GPT-4.1 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4.1-nano",
    "displayName": "GPT-4.1 Nano",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o3",
    "displayName": "O3",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o3-mini",
    "displayName": "O3 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o3-pro",
    "displayName": "O3 Pro",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o4-mini",
    "displayName": "O4 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o1",
    "displayName": "O1",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "o1-mini",
    "displayName": "O1 Mini",
    "kind": "llm"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "text-embedding-3-large",
    "displayName": "Text Embedding 3 Large",
    "kind": "embedding"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "text-embedding-3-small",
    "displayName": "Text Embedding 3 Small",
    "kind": "embedding"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "text-embedding-ada-002",
    "displayName": "Text Embedding Ada 002",
    "kind": "embedding"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "tts-1",
    "displayName": "TTS-1",
    "kind": "tts"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "tts-1-hd",
    "displayName": "TTS-1 HD",
    "kind": "tts"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4o-mini-tts",
    "displayName": "GPT-4o Mini TTS",
    "kind": "tts"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "whisper-1",
    "displayName": "Whisper 1",
    "kind": "stt"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4o-transcribe",
    "displayName": "GPT-4o Transcribe",
    "kind": "stt"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-4o-mini-transcribe",
    "displayName": "GPT-4o Mini Transcribe",
    "kind": "stt"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "gpt-image-1",
    "displayName": "GPT Image 1",
    "kind": "image"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "dall-e-3",
    "displayName": "DALL-E 3",
    "kind": "image"
  },
  {
    "providerId": "openai",
    "providerAlias": "openai",
    "id": "dall-e-2",
    "displayName": "DALL-E 2",
    "kind": "image"
  },
  {
    "providerId": "anthropic",
    "providerAlias": "anthropic",
    "id": "claude-sonnet-4-20250514",
    "displayName": "Claude Sonnet 4",
    "kind": "llm"
  },
  {
    "providerId": "anthropic",
    "providerAlias": "anthropic",
    "id": "claude-opus-4-20250514",
    "displayName": "Claude Opus 4",
    "kind": "llm"
  },
  {
    "providerId": "anthropic",
    "providerAlias": "anthropic",
    "id": "claude-3-5-sonnet-20241022",
    "displayName": "Claude 3.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-3.1-pro-preview",
    "displayName": "Gemini 3.1 Pro Preview",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-3.1-flash-lite-preview",
    "displayName": "Gemini 3.1 Flash Lite Preview",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash Preview",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-pro",
    "displayName": "Gemini 2.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-flash-lite",
    "displayName": "Gemini 2.5 Flash Lite",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.0-flash",
    "displayName": "Gemini 2.0 Flash",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.0-flash-lite",
    "displayName": "Gemini 2.0 Flash Lite",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemma-4-31b-it",
    "displayName": "Gemma 4 31B IT",
    "kind": "llm"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-embedding-2-preview",
    "displayName": "Gemini Embedding 2 Preview",
    "kind": "embedding"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-embedding-001",
    "displayName": "Gemini Embedding 001",
    "kind": "embedding"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "text-embedding-005",
    "displayName": "Text Embedding 005",
    "kind": "embedding"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "text-embedding-004",
    "displayName": "Text Embedding 004 (Legacy)",
    "kind": "embedding"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-3.1-flash-image-preview",
    "displayName": "Gemini 3.1 Flash Image (Nano Banana 2)",
    "kind": "image"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-3-pro-image-preview",
    "displayName": "Gemini 3 Pro Image (Nano Banana Pro)",
    "kind": "image"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-flash-image",
    "displayName": "Gemini 2.5 Flash Image (Nano Banana)",
    "kind": "image"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-pro",
    "displayName": "Gemini 2.5 Pro (Best)",
    "kind": "stt"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "kind": "stt"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.5-flash-lite",
    "displayName": "Gemini 2.5 Flash Lite (Cheapest)",
    "kind": "stt"
  },
  {
    "providerId": "gemini",
    "providerAlias": "gemini",
    "id": "gemini-2.0-flash",
    "displayName": "Gemini 2.0 Flash",
    "kind": "stt"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/text-embedding-3-large",
    "displayName": "OpenAI Text Embedding 3 Large",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/text-embedding-3-small",
    "displayName": "OpenAI Text Embedding 3 Small",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/text-embedding-ada-002",
    "displayName": "OpenAI Text Embedding Ada 002",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "qwen/qwen3-embedding-8b",
    "displayName": "Qwen3 Embedding 8B",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "perplexity/pplx-embed-v1-4b",
    "displayName": "Perplexity Embed V1 4B",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "perplexity/pplx-embed-v1-0.6b",
    "displayName": "Perplexity Embed V1 0.6B",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    "displayName": "NVIDIA Nemotron Embed VL 1B V2 (Free)",
    "kind": "embedding"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/gpt-4o-mini-tts",
    "displayName": "GPT-4o Mini TTS",
    "kind": "tts"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/tts-1-hd",
    "displayName": "TTS-1 HD",
    "kind": "tts"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/tts-1",
    "displayName": "TTS-1",
    "kind": "tts"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/dall-e-3",
    "displayName": "DALL-E 3 (via OpenRouter)",
    "kind": "image"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "openai/gpt-image-1",
    "displayName": "GPT Image 1 (via OpenRouter)",
    "kind": "image"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "google/imagen-3.0-generate-002",
    "displayName": "Imagen 3 (via OpenRouter)",
    "kind": "image"
  },
  {
    "providerId": "openrouter",
    "providerAlias": "openrouter",
    "id": "black-forest-labs/FLUX.1-schnell",
    "displayName": "FLUX.1 Schnell (via OpenRouter)",
    "kind": "image"
  },
  {
    "providerId": "glm",
    "providerAlias": "glm",
    "id": "glm-5.1",
    "displayName": "GLM 5.1",
    "kind": "llm"
  },
  {
    "providerId": "glm",
    "providerAlias": "glm",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "glm",
    "providerAlias": "glm",
    "id": "glm-4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "glm",
    "providerAlias": "glm",
    "id": "glm-4.6v",
    "displayName": "GLM 4.6V (Vision)",
    "kind": "llm"
  },
  {
    "providerId": "glm-cn",
    "providerAlias": "glm-cn",
    "id": "glm-5.1",
    "displayName": "GLM 5.1",
    "kind": "llm"
  },
  {
    "providerId": "glm-cn",
    "providerAlias": "glm-cn",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "glm-cn",
    "providerAlias": "glm-cn",
    "id": "glm-4.7",
    "displayName": "GLM-4.7",
    "kind": "llm"
  },
  {
    "providerId": "glm-cn",
    "providerAlias": "glm-cn",
    "id": "glm-4.6",
    "displayName": "GLM-4.6",
    "kind": "llm"
  },
  {
    "providerId": "glm-cn",
    "providerAlias": "glm-cn",
    "id": "glm-4.5-air",
    "displayName": "GLM-4.5-Air",
    "kind": "llm"
  },
  {
    "providerId": "kimi",
    "providerAlias": "kimi",
    "id": "kimi-k2.6",
    "displayName": "Kimi K2.6",
    "kind": "llm"
  },
  {
    "providerId": "kimi",
    "providerAlias": "kimi",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "kimi",
    "providerAlias": "kimi",
    "id": "kimi-k2.5-thinking",
    "displayName": "Kimi K2.5 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "kimi",
    "providerAlias": "kimi",
    "id": "kimi-latest",
    "displayName": "Kimi Latest",
    "kind": "llm"
  },
  {
    "providerId": "minimax",
    "providerAlias": "minimax",
    "id": "MiniMax-M2.7",
    "displayName": "MiniMax M2.7",
    "kind": "llm"
  },
  {
    "providerId": "minimax",
    "providerAlias": "minimax",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "minimax",
    "providerAlias": "minimax",
    "id": "MiniMax-M2.1",
    "displayName": "MiniMax M2.1",
    "kind": "llm"
  },
  {
    "providerId": "minimax",
    "providerAlias": "minimax",
    "id": "minimax-image-01",
    "displayName": "MiniMax Image 01",
    "kind": "image"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o mini",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "claude-sonnet-4.6",
    "displayName": "Claude Sonnet 4.6",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "claude-sonnet-4.5",
    "displayName": "Claude Sonnet 4.5",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "claude-opus-4.6",
    "displayName": "Claude Opus 4.6",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "claude-sonnet-4-6",
    "displayName": "Claude Sonnet 4.6 (Legacy)",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "claude-opus-4-6",
    "displayName": "Claude Opus 4.6 (Legacy)",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "deepseek-chat",
    "displayName": "DeepSeek Chat",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "deepseek-v3-671b",
    "displayName": "DeepSeek V3 671B",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "deepseek-r1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "o1",
    "displayName": "OpenAI o1",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "o3-mini",
    "displayName": "OpenAI o3-mini",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash Preview",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "qwen3-coder-plus",
    "displayName": "Qwen3 Coder Plus",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "qwen3-max",
    "displayName": "Qwen3 Max",
    "kind": "llm"
  },
  {
    "providerId": "blackbox",
    "providerAlias": "blackbox",
    "id": "qwen3-vl-plus",
    "displayName": "Qwen3 VL Plus",
    "kind": "llm"
  },
  {
    "providerId": "minimax-cn",
    "providerAlias": "minimax-cn",
    "id": "MiniMax-M2.7",
    "displayName": "MiniMax M2.7",
    "kind": "llm"
  },
  {
    "providerId": "minimax-cn",
    "providerAlias": "minimax-cn",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "minimax-cn",
    "providerAlias": "minimax-cn",
    "id": "MiniMax-M2.1",
    "displayName": "MiniMax M2.1",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "qwen3.5-plus",
    "displayName": "Qwen3.5 Plus",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "qwen3-max-2026-01-23",
    "displayName": "Qwen3 Max",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "qwen3-coder-next",
    "displayName": "Qwen3 Coder Next",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "qwen3-coder-plus",
    "displayName": "Qwen3 Coder Plus",
    "kind": "llm"
  },
  {
    "providerId": "alicode",
    "providerAlias": "alicode",
    "id": "glm-4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "qwen3.5-plus",
    "displayName": "Qwen3.5 Plus",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "qwen3-coder-next",
    "displayName": "Qwen3 Coder Next",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "qwen3-coder-plus",
    "displayName": "Qwen3 Coder Plus",
    "kind": "llm"
  },
  {
    "providerId": "alicode-intl",
    "providerAlias": "alicode-intl",
    "id": "glm-4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Doubao-Seed-2.0-Code",
    "displayName": "Doubao-Seed-2.0-Code",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Doubao-Seed-2.0-pro",
    "displayName": "Doubao-Seed-2.0-pro",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Doubao-Seed-2.0-lite",
    "displayName": "Doubao-Seed-2.0-lite",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Doubao-Seed-Code",
    "displayName": "Doubao-Seed-Code",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "GLM-5.1",
    "displayName": "GLM-5.1",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "MiniMax-M2.7",
    "displayName": "MiniMax-M2.7",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Kimi-K2.6",
    "displayName": "Kimi-K2.6",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "MiniMax-M2.5",
    "displayName": "MiniMax-M2.5",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "Kimi-K2.5",
    "displayName": "Kimi-K2.5",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "GLM-4.7",
    "displayName": "GLM-4.7",
    "kind": "llm"
  },
  {
    "providerId": "volcengine-ark",
    "providerAlias": "volcengine-ark",
    "id": "DeepSeek-V3.2",
    "displayName": "DeepSeek-V3.2",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.2-1b-instruct",
    "displayName": "Llama 3.2 1B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.2-3b-instruct",
    "displayName": "Llama 3.2 3B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    "displayName": "Llama 3.1 8B Instruct FP8 Fast",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.1-8b-instruct-awq",
    "displayName": "Llama 3.1 8B Instruct AWQ",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/mistralai/mistral-small-3.1-24b-instruct",
    "displayName": "Mistral Small 3.1 24B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.1-70b-instruct-fp8-fast",
    "displayName": "Llama 3.1 70B Instruct FP8 Fast",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "displayName": "Llama 3.3 70B Instruct FP8 Fast",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    "displayName": "DeepSeek R1 Distill Qwen 32B",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/moonshotai/kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/moonshotai/kimi-k2.6",
    "displayName": "Kimi K2.6",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/zai-org/glm-4.7-flash",
    "displayName": "GLM 4.7 Flash",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/qwen/qwq-32b",
    "displayName": "QwQ 32B",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/qwen/qwen2.5-coder-32b-instruct",
    "displayName": "Qwen 2.5 Coder 32B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/black-forest-labs/flux-2-klein-9b",
    "displayName": "FLUX.2 Klein 9B",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/black-forest-labs/flux-2-klein-4b",
    "displayName": "FLUX.2 Klein 4B",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/black-forest-labs/flux-2-dev",
    "displayName": "FLUX.2 Dev",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/leonardo/lucid-origin",
    "displayName": "Lucid Origin",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/leonardo/phoenix-1.0",
    "displayName": "Phoenix 1.0",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/black-forest-labs/flux-1-schnell",
    "displayName": "FLUX.1 Schnell",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/bytedance/stable-diffusion-xl-lightning",
    "displayName": "SDXL Lightning",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/lykon/dreamshaper-8-lcm",
    "displayName": "DreamShaper 8 LCM",
    "kind": "image"
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/runwayml/stable-diffusion-v1-5-img2img",
    "displayName": "Stable Diffusion v1.5 Img2Img",
    "kind": "image",
    "capabilities": [
      "edit"
    ]
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/runwayml/stable-diffusion-v1-5-inpainting",
    "displayName": "Stable Diffusion v1.5 Inpainting",
    "kind": "image",
    "capabilities": [
      "edit",
      "mask"
    ]
  },
  {
    "providerId": "cloudflare-ai",
    "providerAlias": "cloudflare-ai",
    "id": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    "displayName": "SDXL Base 1.0",
    "kind": "image"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "seed-2-0-pro-260328",
    "displayName": "Seed 2.0 Pro",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "seed-2-0-code-preview-260328",
    "displayName": "Seed 2.0 Code Preview",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "seed-2-0-mini-260215",
    "displayName": "Seed 2.0 Mini",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "seed-2-0-lite-260228",
    "displayName": "Seed 2.0 Lite",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "kimi-k2-thinking-251104",
    "displayName": "Kimi K2 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "glm-4-7-251222",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "byteplus",
    "providerAlias": "byteplus",
    "id": "gpt-oss-120b-250805",
    "displayName": "GPT-OSS-120B",
    "kind": "llm"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-v4-pro",
    "displayName": "DeepSeek V4 Pro",
    "kind": "llm"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-v4-pro-max",
    "displayName": "DeepSeek V4 Pro Max",
    "kind": "llm",
    "upstreamModelId": "deepseek-v4-pro"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-v4-pro-none",
    "displayName": "DeepSeek V4 Pro No Thinking",
    "kind": "llm",
    "upstreamModelId": "deepseek-v4-pro"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-v4-flash",
    "displayName": "DeepSeek V4 Flash",
    "kind": "llm"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-chat",
    "displayName": "DeepSeek V3.2 Chat",
    "kind": "llm"
  },
  {
    "providerId": "deepseek",
    "providerAlias": "deepseek",
    "id": "deepseek-reasoner",
    "displayName": "DeepSeek V3.2 Reasoner",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "deepseek/deepseek-v4-pro",
    "displayName": "DeepSeek V4 Pro",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "deepseek/deepseek-v4-flash",
    "displayName": "DeepSeek V4 Flash",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "moonshotai/Kimi-K2.6",
    "displayName": "Kimi K2.6",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "moonshotai/Kimi-K2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "zai-org/GLM-5.1",
    "displayName": "GLM 5.1",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "zai-org/GLM-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "MiniMaxAI/MiniMax-M2.7",
    "displayName": "MiniMax M2.7",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "MiniMaxAI/MiniMax-M2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "Qwen/Qwen3.6-Max-Preview",
    "displayName": "Qwen 3.6 Max Preview",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "Qwen/Qwen3.6-Plus",
    "displayName": "Qwen 3.6 Plus",
    "kind": "llm"
  },
  {
    "providerId": "commandcode",
    "providerAlias": "commandcode",
    "id": "stepfun/Step-3.5-Flash",
    "displayName": "Step 3.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "llama-3.3-70b-versatile",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "displayName": "Llama 4 Maverick",
    "kind": "llm"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "qwen/qwen3-32b",
    "displayName": "Qwen3 32B",
    "kind": "llm"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "openai/gpt-oss-120b",
    "displayName": "GPT-OSS 120B",
    "kind": "llm"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "whisper-large-v3",
    "displayName": "Whisper Large v3",
    "kind": "stt"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "whisper-large-v3-turbo",
    "displayName": "Whisper Large v3 Turbo",
    "kind": "stt"
  },
  {
    "providerId": "groq",
    "providerAlias": "groq",
    "id": "distil-whisper-large-v3-en",
    "displayName": "Distil Whisper Large v3 EN",
    "kind": "stt"
  },
  {
    "providerId": "xai",
    "providerAlias": "xai",
    "id": "grok-4",
    "displayName": "Grok 4",
    "kind": "llm"
  },
  {
    "providerId": "xai",
    "providerAlias": "xai",
    "id": "grok-4-fast-reasoning",
    "displayName": "Grok 4 Fast Reasoning",
    "kind": "llm"
  },
  {
    "providerId": "xai",
    "providerAlias": "xai",
    "id": "grok-code-fast-1",
    "displayName": "Grok Code Fast",
    "kind": "llm"
  },
  {
    "providerId": "xai",
    "providerAlias": "xai",
    "id": "grok-3",
    "displayName": "Grok 3",
    "kind": "llm"
  },
  {
    "providerId": "mistral",
    "providerAlias": "mistral",
    "id": "mistral-large-latest",
    "displayName": "Mistral Large 3",
    "kind": "llm"
  },
  {
    "providerId": "mistral",
    "providerAlias": "mistral",
    "id": "codestral-latest",
    "displayName": "Codestral",
    "kind": "llm"
  },
  {
    "providerId": "mistral",
    "providerAlias": "mistral",
    "id": "mistral-medium-latest",
    "displayName": "Mistral Medium 3",
    "kind": "llm"
  },
  {
    "providerId": "mistral",
    "providerAlias": "mistral",
    "id": "mistral-embed",
    "displayName": "Mistral Embed",
    "kind": "embedding"
  },
  {
    "providerId": "perplexity",
    "providerAlias": "perplexity",
    "id": "sonar-pro",
    "displayName": "Sonar Pro",
    "kind": "llm"
  },
  {
    "providerId": "perplexity",
    "providerAlias": "perplexity",
    "id": "sonar",
    "displayName": "Sonar",
    "kind": "llm"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "displayName": "Llama 3.3 70B Turbo",
    "kind": "llm"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "deepseek-ai/DeepSeek-R1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "Qwen/Qwen3-235B-A22B",
    "displayName": "Qwen3 235B",
    "kind": "llm"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "displayName": "Llama 4 Maverick",
    "kind": "llm"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "BAAI/bge-large-en-v1.5",
    "displayName": "BGE Large EN v1.5",
    "kind": "embedding"
  },
  {
    "providerId": "together",
    "providerAlias": "together",
    "id": "togethercomputer/m2-bert-80M-8k-retrieval",
    "displayName": "M2 BERT 80M 8K",
    "kind": "embedding"
  },
  {
    "providerId": "fireworks",
    "providerAlias": "fireworks",
    "id": "accounts/fireworks/models/deepseek-v3p1",
    "displayName": "DeepSeek V3.1",
    "kind": "llm"
  },
  {
    "providerId": "fireworks",
    "providerAlias": "fireworks",
    "id": "accounts/fireworks/models/llama-v3p3-70b-instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "fireworks",
    "providerAlias": "fireworks",
    "id": "accounts/fireworks/models/qwen3-235b-a22b",
    "displayName": "Qwen3 235B",
    "kind": "llm"
  },
  {
    "providerId": "fireworks",
    "providerAlias": "fireworks",
    "id": "nomic-ai/nomic-embed-text-v1.5",
    "displayName": "Nomic Embed Text v1.5",
    "kind": "embedding"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "gpt-oss-120b",
    "displayName": "GPT OSS 120B",
    "kind": "llm"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "zai-glm-4.7",
    "displayName": "ZAI GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "llama-3.3-70b",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "llama-4-scout-17b-16e-instruct",
    "displayName": "Llama 4 Scout",
    "kind": "llm"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "qwen-3-235b-a22b-instruct-2507",
    "displayName": "Qwen3 235B A22B",
    "kind": "llm"
  },
  {
    "providerId": "cerebras",
    "providerAlias": "cerebras",
    "id": "qwen-3-32b",
    "displayName": "Qwen3 32B",
    "kind": "llm"
  },
  {
    "providerId": "cohere",
    "providerAlias": "cohere",
    "id": "command-r-plus-08-2024",
    "displayName": "Command R+ (Aug 2024)",
    "kind": "llm"
  },
  {
    "providerId": "cohere",
    "providerAlias": "cohere",
    "id": "command-r-08-2024",
    "displayName": "Command R (Aug 2024)",
    "kind": "llm"
  },
  {
    "providerId": "cohere",
    "providerAlias": "cohere",
    "id": "command-a-03-2025",
    "displayName": "Command A (Mar 2025)",
    "kind": "llm"
  },
  {
    "providerId": "nvidia",
    "providerAlias": "nvidia",
    "id": "minimaxai/minimax-m2.7",
    "displayName": "Minimax M2.7",
    "kind": "llm"
  },
  {
    "providerId": "nvidia",
    "providerAlias": "nvidia",
    "id": "z-ai/glm4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "nvidia",
    "providerAlias": "nvidia",
    "id": "nvidia/nv-embedqa-e5-v5",
    "displayName": "NV EmbedQA E5 v5",
    "kind": "embedding"
  },
  {
    "providerId": "nvidia",
    "providerAlias": "nvidia",
    "id": "nvidia/parakeet-ctc-1.1b-asr",
    "displayName": "Parakeet CTC 1.1B",
    "kind": "stt"
  },
  {
    "providerId": "nebius",
    "providerAlias": "nebius",
    "id": "meta-llama/Llama-3.3-70B-Instruct",
    "displayName": "Llama 3.3 70B Instruct",
    "kind": "llm"
  },
  {
    "providerId": "nebius",
    "providerAlias": "nebius",
    "id": "Qwen/Qwen3-Embedding-8B",
    "displayName": "Qwen3 Embedding 8B",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-3-large",
    "displayName": "Voyage 3 Large",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-3.5",
    "displayName": "Voyage 3.5",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-3.5-lite",
    "displayName": "Voyage 3.5 Lite",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-code-3",
    "displayName": "Voyage Code 3",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-finance-2",
    "displayName": "Voyage Finance 2",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-law-2",
    "displayName": "Voyage Law 2",
    "kind": "embedding"
  },
  {
    "providerId": "voyage-ai",
    "providerAlias": "voyage-ai",
    "id": "voyage-multilingual-2",
    "displayName": "Voyage Multilingual 2",
    "kind": "embedding"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "deepseek-ai/DeepSeek-V3.2",
    "displayName": "DeepSeek V3.2",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "deepseek-ai/DeepSeek-V3.1",
    "displayName": "DeepSeek V3.1",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "deepseek-ai/DeepSeek-R1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "Qwen/Qwen3-235B-A22B-Instruct-2507",
    "displayName": "Qwen3 235B",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "displayName": "Qwen3 Coder 480B",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "Qwen/Qwen3-32B",
    "displayName": "Qwen3 32B",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "moonshotai/Kimi-K2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "zai-org/GLM-4.7",
    "displayName": "GLM 4.7",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "openai/gpt-oss-120b",
    "displayName": "GPT OSS 120B",
    "kind": "llm"
  },
  {
    "providerId": "siliconflow",
    "providerAlias": "siliconflow",
    "id": "baidu/ERNIE-4.5-300B-A47B",
    "displayName": "ERNIE 4.5 300B",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-mimo",
    "providerAlias": "xiaomi-mimo",
    "id": "mimo-v2.5-pro",
    "displayName": "MiMo V2.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-mimo",
    "providerAlias": "xiaomi-mimo",
    "id": "mimo-v2.5",
    "displayName": "MiMo V2.5",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-mimo",
    "providerAlias": "xiaomi-mimo",
    "id": "mimo-v2-omni",
    "displayName": "MiMo V2 Omni",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-mimo",
    "providerAlias": "xiaomi-mimo",
    "id": "mimo-v2-flash",
    "displayName": "MiMo V2 Flash",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2.5-pro",
    "displayName": "MiMo V2.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2.5",
    "displayName": "MiMo V2.5",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2-pro",
    "displayName": "MiMo V2 Pro",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2-omni",
    "displayName": "MiMo V2 Omni",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2-tts",
    "displayName": "MiMo V2 TTS",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2.5-tts",
    "displayName": "MiMo V2.5 TTS",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2.5-tts-voiceclone",
    "displayName": "MiMo V2.5 TTS Voice Clone",
    "kind": "llm"
  },
  {
    "providerId": "xiaomi-tokenplan",
    "providerAlias": "xiaomi-tokenplan",
    "id": "mimo-v2.5-tts-voicedesign",
    "displayName": "MiMo V2.5 TTS Voice Design",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "Qwen/QwQ-32B",
    "displayName": "QwQ 32B",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "deepseek-ai/DeepSeek-R1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "deepseek-ai/DeepSeek-V3",
    "displayName": "DeepSeek V3",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "meta-llama/Llama-3.3-70B-Instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "meta-llama/Llama-3.2-3B-Instruct",
    "displayName": "Llama 3.2 3B",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "Qwen/Qwen2.5-72B-Instruct",
    "displayName": "Qwen 2.5 72B",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "displayName": "Qwen 2.5 Coder 32B",
    "kind": "llm"
  },
  {
    "providerId": "hyperbolic",
    "providerAlias": "hyperbolic",
    "id": "NousResearch/Hermes-3-Llama-3.1-70B",
    "displayName": "Hermes 3 70B",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "gpt-oss:120b",
    "displayName": "GPT OSS 120B",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "kimi-k2.5",
    "displayName": "Kimi K2.5",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "glm-5",
    "displayName": "GLM 5",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "minimax-m2.5",
    "displayName": "MiniMax M2.5",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "glm-4.7-flash",
    "displayName": "GLM 4.7 Flash",
    "kind": "llm"
  },
  {
    "providerId": "ollama",
    "providerAlias": "ollama",
    "id": "qwen3.5",
    "displayName": "Qwen3.5",
    "kind": "llm"
  },
  {
    "providerId": "vertex",
    "providerAlias": "vertex",
    "id": "gemini-3.1-pro-preview",
    "displayName": "Gemini 3.1 Pro Preview",
    "kind": "llm"
  },
  {
    "providerId": "vertex",
    "providerAlias": "vertex",
    "id": "gemini-3.1-flash-lite-preview",
    "displayName": "Gemini 3.1 Flash Lite Preview",
    "kind": "llm"
  },
  {
    "providerId": "vertex",
    "providerAlias": "vertex",
    "id": "gemini-3-flash-preview",
    "displayName": "Gemini 3 Flash Preview",
    "kind": "llm"
  },
  {
    "providerId": "vertex",
    "providerAlias": "vertex",
    "id": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "vertex-partner",
    "providerAlias": "vertex-partner",
    "id": "deepseek-ai/deepseek-v3.2-maas",
    "displayName": "DeepSeek V3.2 (Vertex)",
    "kind": "llm"
  },
  {
    "providerId": "vertex-partner",
    "providerAlias": "vertex-partner",
    "id": "qwen/qwen3-next-80b-a3b-thinking-maas",
    "displayName": "Qwen3 Next 80B Thinking (Vertex)",
    "kind": "llm"
  },
  {
    "providerId": "vertex-partner",
    "providerAlias": "vertex-partner",
    "id": "qwen/qwen3-next-80b-a3b-instruct-maas",
    "displayName": "Qwen3 Next 80B Instruct (Vertex)",
    "kind": "llm"
  },
  {
    "providerId": "vertex-partner",
    "providerAlias": "vertex-partner",
    "id": "zai-org/glm-5-maas",
    "displayName": "GLM-5 (Vertex)",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-3",
    "displayName": "Grok 3",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-3-mini",
    "displayName": "Grok 3 Mini (Thinking)",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-3-thinking",
    "displayName": "Grok 3 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4",
    "displayName": "Grok 4",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4-mini",
    "displayName": "Grok 4 Mini (Thinking)",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4-thinking",
    "displayName": "Grok 4 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4-heavy",
    "displayName": "Grok 4 Heavy (SuperGrok)",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4.1-mini",
    "displayName": "Grok 4.1 Mini (Thinking)",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4.1-fast",
    "displayName": "Grok 4.1 Fast",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4.1-expert",
    "displayName": "Grok 4.1 Expert",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4.1-thinking",
    "displayName": "Grok 4.1 Thinking",
    "kind": "llm"
  },
  {
    "providerId": "grok-web",
    "providerAlias": "grok-web",
    "id": "grok-4.2",
    "displayName": "Grok 4.2 (4.20 Beta)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-auto",
    "displayName": "Perplexity Auto (Free)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-sonar",
    "displayName": "Perplexity Sonar",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-gpt",
    "displayName": "GPT-5.4 (via Perplexity)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-gemini",
    "displayName": "Gemini 3.1 Pro (via Perplexity)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-sonnet",
    "displayName": "Claude Sonnet 4.6 (via Perplexity)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-opus",
    "displayName": "Claude Opus 4.6 (via Perplexity)",
    "kind": "llm"
  },
  {
    "providerId": "perplexity-web",
    "providerAlias": "perplexity-web",
    "id": "pplx-nemotron",
    "displayName": "Nemotron 3 Super (via Perplexity)",
    "kind": "llm"
  },
  {
    "providerId": "openai-tts-models",
    "providerAlias": "openai-tts-models",
    "id": "gpt-4o-mini-tts",
    "displayName": "GPT-4o Mini TTS",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-models",
    "providerAlias": "openai-tts-models",
    "id": "tts-1-hd",
    "displayName": "TTS-1 HD",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-models",
    "providerAlias": "openai-tts-models",
    "id": "tts-1",
    "displayName": "TTS-1",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "alloy",
    "displayName": "Alloy",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "ash",
    "displayName": "Ash",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "ballad",
    "displayName": "Ballad",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "cedar",
    "displayName": "Cedar",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "coral",
    "displayName": "Coral",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "echo",
    "displayName": "Echo",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "fable",
    "displayName": "Fable",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "marin",
    "displayName": "Marin",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "nova",
    "displayName": "Nova",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "onyx",
    "displayName": "Onyx",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "sage",
    "displayName": "Sage",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "shimmer",
    "displayName": "Shimmer",
    "kind": "tts"
  },
  {
    "providerId": "openai-tts-voices",
    "providerAlias": "openai-tts-voices",
    "id": "verse",
    "displayName": "Verse",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-models",
    "providerAlias": "openrouter-tts-models",
    "id": "openai/gpt-4o-mini-tts",
    "displayName": "GPT-4o Mini TTS",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-models",
    "providerAlias": "openrouter-tts-models",
    "id": "openai/tts-1-hd",
    "displayName": "TTS-1 HD",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-models",
    "providerAlias": "openrouter-tts-models",
    "id": "openai/tts-1",
    "displayName": "TTS-1",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "alloy",
    "displayName": "Alloy",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "ash",
    "displayName": "Ash",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "ballad",
    "displayName": "Ballad",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "cedar",
    "displayName": "Cedar",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "coral",
    "displayName": "Coral",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "echo",
    "displayName": "Echo",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "fable",
    "displayName": "Fable",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "marin",
    "displayName": "Marin",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "nova",
    "displayName": "Nova",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "onyx",
    "displayName": "Onyx",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "sage",
    "displayName": "Sage",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "shimmer",
    "displayName": "Shimmer",
    "kind": "tts"
  },
  {
    "providerId": "openrouter-tts-voices",
    "providerAlias": "openrouter-tts-voices",
    "id": "verse",
    "displayName": "Verse",
    "kind": "tts"
  },
  {
    "providerId": "elevenlabs-tts-models",
    "providerAlias": "elevenlabs-tts-models",
    "id": "eleven_flash_v2_5",
    "displayName": "Flash v2.5 (Fastest)",
    "kind": "tts"
  },
  {
    "providerId": "elevenlabs-tts-models",
    "providerAlias": "elevenlabs-tts-models",
    "id": "eleven_turbo_v2_5",
    "displayName": "Turbo v2.5 (Fast)",
    "kind": "tts"
  },
  {
    "providerId": "elevenlabs-tts-models",
    "providerAlias": "elevenlabs-tts-models",
    "id": "eleven_multilingual_v2",
    "displayName": "Multilingual v2 (Quality)",
    "kind": "tts"
  },
  {
    "providerId": "elevenlabs-tts-models",
    "providerAlias": "elevenlabs-tts-models",
    "id": "eleven_monolingual_v1",
    "displayName": "Monolingual v1 (English)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "en-US-AriaNeural",
    "displayName": "Aria (en-US)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "en-US-GuyNeural",
    "displayName": "Guy (en-US)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "en-GB-SoniaNeural",
    "displayName": "Sonia (en-GB)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "vi-VN-HoaiMyNeural",
    "displayName": "Hoai My (vi-VN)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "vi-VN-NamMinhNeural",
    "displayName": "Nam Minh (vi-VN)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "zh-CN-XiaoxiaoNeural",
    "displayName": "Xiaoxiao (zh-CN)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "zh-CN-YunxiNeural",
    "displayName": "Yunxi (zh-CN)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "fr-FR-DeniseNeural",
    "displayName": "Denise (fr-FR)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "de-DE-KatjaNeural",
    "displayName": "Katja (de-DE)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "ja-JP-NanamiNeural",
    "displayName": "Nanami (ja-JP)",
    "kind": "tts"
  },
  {
    "providerId": "edge-tts",
    "providerAlias": "edge-tts",
    "id": "ko-KR-SunHiNeural",
    "displayName": "SunHi (ko-KR)",
    "kind": "tts"
  },
  {
    "providerId": "local-device",
    "providerAlias": "local-device",
    "id": "default",
    "displayName": "System Default Voice",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "af",
    "displayName": "Afrikaans",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ar",
    "displayName": "Arabic",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "bg",
    "displayName": "Bulgarian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "bn",
    "displayName": "Bengali",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "bs",
    "displayName": "Bosnian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ca",
    "displayName": "Catalan",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "cs",
    "displayName": "Czech",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "cy",
    "displayName": "Welsh",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "da",
    "displayName": "Danish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "de",
    "displayName": "German",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "el",
    "displayName": "Greek",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "en",
    "displayName": "English",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "eo",
    "displayName": "Esperanto",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "es",
    "displayName": "Spanish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "et",
    "displayName": "Estonian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "fi",
    "displayName": "Finnish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "fr",
    "displayName": "French",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "gu",
    "displayName": "Gujarati",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "hi",
    "displayName": "Hindi",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "hr",
    "displayName": "Croatian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "hu",
    "displayName": "Hungarian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "hy",
    "displayName": "Armenian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "id",
    "displayName": "Indonesian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "is",
    "displayName": "Icelandic",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "it",
    "displayName": "Italian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ja",
    "displayName": "Japanese",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "jw",
    "displayName": "Javanese",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "km",
    "displayName": "Khmer",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "kn",
    "displayName": "Kannada",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ko",
    "displayName": "Korean",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "la",
    "displayName": "Latin",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "lv",
    "displayName": "Latvian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "mk",
    "displayName": "Macedonian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ml",
    "displayName": "Malayalam",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "mr",
    "displayName": "Marathi",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "my",
    "displayName": "Myanmar (Burmese)",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ne",
    "displayName": "Nepali",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "nl",
    "displayName": "Dutch",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "no",
    "displayName": "Norwegian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "pl",
    "displayName": "Polish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "pt",
    "displayName": "Portuguese",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ro",
    "displayName": "Romanian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ru",
    "displayName": "Russian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "si",
    "displayName": "Sinhala",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "sk",
    "displayName": "Slovak",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "sq",
    "displayName": "Albanian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "sr",
    "displayName": "Serbian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "su",
    "displayName": "Sundanese",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "sv",
    "displayName": "Swedish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "sw",
    "displayName": "Swahili",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ta",
    "displayName": "Tamil",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "te",
    "displayName": "Telugu",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "th",
    "displayName": "Thai",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "tl",
    "displayName": "Filipino",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "tr",
    "displayName": "Turkish",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "uk",
    "displayName": "Ukrainian",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "ur",
    "displayName": "Urdu",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "vi",
    "displayName": "Vietnamese",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "zh-CN",
    "displayName": "Chinese (Simplified)",
    "kind": "tts"
  },
  {
    "providerId": "google-tts",
    "providerAlias": "google-tts",
    "id": "zh-TW",
    "displayName": "Chinese (Traditional)",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-models",
    "providerAlias": "gemini-tts-models",
    "id": "gemini-2.5-flash-preview-tts",
    "displayName": "Gemini 2.5 Flash TTS",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-models",
    "providerAlias": "gemini-tts-models",
    "id": "gemini-2.5-pro-preview-tts",
    "displayName": "Gemini 2.5 Pro TTS",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Zephyr",
    "displayName": "Zephyr",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Puck",
    "displayName": "Puck",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Charon",
    "displayName": "Charon",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Kore",
    "displayName": "Kore",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Fenrir",
    "displayName": "Fenrir",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Leda",
    "displayName": "Leda",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Orus",
    "displayName": "Orus",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Aoede",
    "displayName": "Aoede",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Callirrhoe",
    "displayName": "Callirrhoe",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Autonoe",
    "displayName": "Autonoe",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Enceladus",
    "displayName": "Enceladus",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Iapetus",
    "displayName": "Iapetus",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Umbriel",
    "displayName": "Umbriel",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Algieba",
    "displayName": "Algieba",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Despina",
    "displayName": "Despina",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Erinome",
    "displayName": "Erinome",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Algenib",
    "displayName": "Algenib",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Rasalgethi",
    "displayName": "Rasalgethi",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Laomedeia",
    "displayName": "Laomedeia",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Achernar",
    "displayName": "Achernar",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Alnilam",
    "displayName": "Alnilam",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Schedar",
    "displayName": "Schedar",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Gacrux",
    "displayName": "Gacrux",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Pulcherrima",
    "displayName": "Pulcherrima",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Achird",
    "displayName": "Achird",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Zubenelgenubi",
    "displayName": "Zubenelgenubi",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Vindemiatrix",
    "displayName": "Vindemiatrix",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Sadachbia",
    "displayName": "Sadachbia",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Sadaltager",
    "displayName": "Sadaltager",
    "kind": "tts"
  },
  {
    "providerId": "gemini-tts-voices",
    "providerAlias": "gemini-tts-voices",
    "id": "Sulafat",
    "displayName": "Sulafat",
    "kind": "tts"
  },
  {
    "providerId": "nanobanana",
    "providerAlias": "nanobanana",
    "id": "nanobanana-flash",
    "displayName": "NanoBanana Flash",
    "kind": "image"
  },
  {
    "providerId": "nanobanana",
    "providerAlias": "nanobanana",
    "id": "nanobanana-pro",
    "displayName": "NanoBanana Pro",
    "kind": "image"
  },
  {
    "providerId": "sdwebui",
    "providerAlias": "sdwebui",
    "id": "stable-diffusion-v1-5",
    "displayName": "Stable Diffusion v1.5",
    "kind": "image"
  },
  {
    "providerId": "sdwebui",
    "providerAlias": "sdwebui",
    "id": "sdxl-base-1.0",
    "displayName": "SDXL Base 1.0",
    "kind": "image"
  },
  {
    "providerId": "comfyui",
    "providerAlias": "comfyui",
    "id": "flux-dev",
    "displayName": "FLUX Dev",
    "kind": "image"
  },
  {
    "providerId": "comfyui",
    "providerAlias": "comfyui",
    "id": "sdxl",
    "displayName": "SDXL",
    "kind": "image"
  },
  {
    "providerId": "huggingface",
    "providerAlias": "huggingface",
    "id": "black-forest-labs/FLUX.1-schnell",
    "displayName": "FLUX.1 Schnell",
    "kind": "image"
  },
  {
    "providerId": "huggingface",
    "providerAlias": "huggingface",
    "id": "stabilityai/stable-diffusion-xl-base-1.0",
    "displayName": "SDXL Base 1.0",
    "kind": "image"
  },
  {
    "providerId": "huggingface",
    "providerAlias": "huggingface",
    "id": "openai/whisper-large-v3",
    "displayName": "Whisper Large v3 (HF)",
    "kind": "stt"
  },
  {
    "providerId": "huggingface",
    "providerAlias": "huggingface",
    "id": "openai/whisper-small",
    "displayName": "Whisper Small (HF)",
    "kind": "stt"
  },
  {
    "providerId": "agentrouter",
    "providerAlias": "agentrouter",
    "id": "claude-opus-4-6",
    "displayName": "Claude 4.6 Opus",
    "kind": "llm"
  },
  {
    "providerId": "agentrouter",
    "providerAlias": "agentrouter",
    "id": "claude-haiku-4-5-20251001",
    "displayName": "Claude 4.5 Haiku",
    "kind": "llm"
  },
  {
    "providerId": "agentrouter",
    "providerAlias": "agentrouter",
    "id": "glm-5.1",
    "displayName": "GLM 5.1",
    "kind": "llm"
  },
  {
    "providerId": "agentrouter",
    "providerAlias": "agentrouter",
    "id": "deepseek-v3.2",
    "displayName": "DeepSeek V3.2",
    "kind": "llm"
  },
  {
    "providerId": "aimlapi",
    "providerAlias": "aimlapi",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "aimlapi",
    "providerAlias": "aimlapi",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o Mini",
    "kind": "llm"
  },
  {
    "providerId": "aimlapi",
    "providerAlias": "aimlapi",
    "id": "claude-3-5-sonnet-20241022",
    "displayName": "Claude 3.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "aimlapi",
    "providerAlias": "aimlapi",
    "id": "gemini-2.0-flash-exp",
    "displayName": "Gemini 2.0 Flash",
    "kind": "llm"
  },
  {
    "providerId": "aimlapi",
    "providerAlias": "aimlapi",
    "id": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "displayName": "Llama 3.1 70B",
    "kind": "llm"
  },
  {
    "providerId": "novita",
    "providerAlias": "novita",
    "id": "deepseek/deepseek-r1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "novita",
    "providerAlias": "novita",
    "id": "deepseek/deepseek-v3",
    "displayName": "DeepSeek V3",
    "kind": "llm"
  },
  {
    "providerId": "novita",
    "providerAlias": "novita",
    "id": "meta-llama/llama-3.3-70b-instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "novita",
    "providerAlias": "novita",
    "id": "qwen/qwen-2.5-72b-instruct",
    "displayName": "Qwen 2.5 72B",
    "kind": "llm"
  },
  {
    "providerId": "modal",
    "providerAlias": "modal",
    "id": "auto",
    "displayName": "Auto (User-hosted)",
    "kind": "llm"
  },
  {
    "providerId": "reka",
    "providerAlias": "reka",
    "id": "reka-flash-3",
    "displayName": "Reka Flash 3",
    "kind": "llm"
  },
  {
    "providerId": "reka",
    "providerAlias": "reka",
    "id": "reka-edge-2603",
    "displayName": "Reka Edge 2603",
    "kind": "llm"
  },
  {
    "providerId": "nlpcloud",
    "providerAlias": "nlpcloud",
    "id": "chatdolphin",
    "displayName": "ChatDolphin",
    "kind": "llm"
  },
  {
    "providerId": "nlpcloud",
    "providerAlias": "nlpcloud",
    "id": "dolphin",
    "displayName": "Dolphin",
    "kind": "llm"
  },
  {
    "providerId": "nlpcloud",
    "providerAlias": "nlpcloud",
    "id": "finetuned-llama-3-70b",
    "displayName": "Llama 3 70B (Finetuned)",
    "kind": "llm"
  },
  {
    "providerId": "bazaarlink",
    "providerAlias": "bazaarlink",
    "id": "auto:free",
    "displayName": "Auto Free (Zero Cost)",
    "kind": "llm"
  },
  {
    "providerId": "bazaarlink",
    "providerAlias": "bazaarlink",
    "id": "auto",
    "displayName": "Auto (Best Model)",
    "kind": "llm"
  },
  {
    "providerId": "completions",
    "providerAlias": "completions",
    "id": "claude-opus-4",
    "displayName": "Claude Opus 4",
    "kind": "llm"
  },
  {
    "providerId": "completions",
    "providerAlias": "completions",
    "id": "claude-sonnet-4",
    "displayName": "Claude Sonnet 4",
    "kind": "llm"
  },
  {
    "providerId": "completions",
    "providerAlias": "completions",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "completions",
    "providerAlias": "completions",
    "id": "gemini-2.0-flash",
    "displayName": "Gemini 2.0 Flash",
    "kind": "llm"
  },
  {
    "providerId": "enally",
    "providerAlias": "enally",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "enally",
    "providerAlias": "enally",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o Mini",
    "kind": "llm"
  },
  {
    "providerId": "enally",
    "providerAlias": "enally",
    "id": "claude-3-5-sonnet",
    "displayName": "Claude 3.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "freetheai",
    "providerAlias": "freetheai",
    "id": "gpt-4o",
    "displayName": "GPT-4o",
    "kind": "llm"
  },
  {
    "providerId": "freetheai",
    "providerAlias": "freetheai",
    "id": "claude-3-5-sonnet",
    "displayName": "Claude 3.5 Sonnet",
    "kind": "llm"
  },
  {
    "providerId": "freetheai",
    "providerAlias": "freetheai",
    "id": "gemini-1.5-pro",
    "displayName": "Gemini 1.5 Pro",
    "kind": "llm"
  },
  {
    "providerId": "freetheai",
    "providerAlias": "freetheai",
    "id": "deepseek-chat",
    "displayName": "DeepSeek Chat",
    "kind": "llm"
  },
  {
    "providerId": "llm7",
    "providerAlias": "llm7",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o Mini",
    "kind": "llm"
  },
  {
    "providerId": "llm7",
    "providerAlias": "llm7",
    "id": "gpt-4.1-mini",
    "displayName": "GPT-4.1 Mini",
    "kind": "llm"
  },
  {
    "providerId": "llm7",
    "providerAlias": "llm7",
    "id": "gemini-1.5-flash",
    "displayName": "Gemini 1.5 Flash",
    "kind": "llm"
  },
  {
    "providerId": "lepton",
    "providerAlias": "lepton",
    "id": "llama3-1-405b",
    "displayName": "Llama 3.1 405B",
    "kind": "llm"
  },
  {
    "providerId": "lepton",
    "providerAlias": "lepton",
    "id": "llama3-1-70b",
    "displayName": "Llama 3.1 70B",
    "kind": "llm"
  },
  {
    "providerId": "lepton",
    "providerAlias": "lepton",
    "id": "llama3-1-8b",
    "displayName": "Llama 3.1 8B",
    "kind": "llm"
  },
  {
    "providerId": "lepton",
    "providerAlias": "lepton",
    "id": "mixtral-8x7b",
    "displayName": "Mixtral 8x7B",
    "kind": "llm"
  },
  {
    "providerId": "kluster",
    "providerAlias": "kluster",
    "id": "deepseek-ai/DeepSeek-R1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "kluster",
    "providerAlias": "kluster",
    "id": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "displayName": "Llama 4 Maverick",
    "kind": "llm"
  },
  {
    "providerId": "kluster",
    "providerAlias": "kluster",
    "id": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "displayName": "Llama 4 Scout",
    "kind": "llm"
  },
  {
    "providerId": "kluster",
    "providerAlias": "kluster",
    "id": "Qwen/Qwen3-235B-A22B-Instruct",
    "displayName": "Qwen3 235B",
    "kind": "llm"
  },
  {
    "providerId": "ai21",
    "providerAlias": "ai21",
    "id": "jamba-large",
    "displayName": "Jamba 1.5 Large",
    "kind": "llm"
  },
  {
    "providerId": "ai21",
    "providerAlias": "ai21",
    "id": "jamba-mini",
    "displayName": "Jamba 1.5 Mini",
    "kind": "llm"
  },
  {
    "providerId": "inference-net",
    "providerAlias": "inference-net",
    "id": "meta-llama/llama-3.3-70b-instruct/fp-16",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "inference-net",
    "providerAlias": "inference-net",
    "id": "deepseek/deepseek-v3-0324",
    "displayName": "DeepSeek V3",
    "kind": "llm"
  },
  {
    "providerId": "inference-net",
    "providerAlias": "inference-net",
    "id": "mistralai/mistral-nemo-12b-instruct/fp-16",
    "displayName": "Mistral Nemo 12B",
    "kind": "llm"
  },
  {
    "providerId": "predibase",
    "providerAlias": "predibase",
    "id": "llama-3-2-3b-instruct",
    "displayName": "Llama 3.2 3B",
    "kind": "llm"
  },
  {
    "providerId": "predibase",
    "providerAlias": "predibase",
    "id": "llama-3-1-8b-instruct",
    "displayName": "Llama 3.1 8B",
    "kind": "llm"
  },
  {
    "providerId": "predibase",
    "providerAlias": "predibase",
    "id": "qwen2-5-7b-instruct",
    "displayName": "Qwen 2.5 7B",
    "kind": "llm"
  },
  {
    "providerId": "bytez",
    "providerAlias": "bytez",
    "id": "meta-llama/Llama-3.3-70B-Instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "bytez",
    "providerAlias": "bytez",
    "id": "mistralai/Mistral-7B-Instruct-v0.3",
    "displayName": "Mistral 7B v0.3",
    "kind": "llm"
  },
  {
    "providerId": "bytez",
    "providerAlias": "bytez",
    "id": "Qwen/Qwen2.5-72B-Instruct",
    "displayName": "Qwen 2.5 72B",
    "kind": "llm"
  },
  {
    "providerId": "morph",
    "providerAlias": "morph",
    "id": "morph-v3-large",
    "displayName": "Morph V3 Large",
    "kind": "llm"
  },
  {
    "providerId": "morph",
    "providerAlias": "morph",
    "id": "morph-v3-fast",
    "displayName": "Morph V3 Fast",
    "kind": "llm"
  },
  {
    "providerId": "longcat",
    "providerAlias": "longcat",
    "id": "LongCat-Flash-Chat",
    "displayName": "LongCat Flash Chat",
    "kind": "llm"
  },
  {
    "providerId": "longcat",
    "providerAlias": "longcat",
    "id": "LongCat-Flash-Thinking",
    "displayName": "LongCat Flash Thinking",
    "kind": "llm"
  },
  {
    "providerId": "longcat",
    "providerAlias": "longcat",
    "id": "LongCat-Flash-Lite",
    "displayName": "LongCat Flash Lite",
    "kind": "llm"
  },
  {
    "providerId": "puter",
    "providerAlias": "puter",
    "id": "gpt-5",
    "displayName": "GPT-5",
    "kind": "llm"
  },
  {
    "providerId": "puter",
    "providerAlias": "puter",
    "id": "claude-opus-4",
    "displayName": "Claude Opus 4",
    "kind": "llm"
  },
  {
    "providerId": "puter",
    "providerAlias": "puter",
    "id": "gemini-3-pro-preview",
    "displayName": "Gemini 3 Pro",
    "kind": "llm"
  },
  {
    "providerId": "puter",
    "providerAlias": "puter",
    "id": "grok-4",
    "displayName": "Grok 4",
    "kind": "llm"
  },
  {
    "providerId": "puter",
    "providerAlias": "puter",
    "id": "deepseek-chat",
    "displayName": "DeepSeek V3",
    "kind": "llm"
  },
  {
    "providerId": "uncloseai",
    "providerAlias": "uncloseai",
    "id": "auto",
    "displayName": "Auto (Free)",
    "kind": "llm"
  },
  {
    "providerId": "uncloseai",
    "providerAlias": "uncloseai",
    "id": "gpt-4o-mini",
    "displayName": "GPT-4o Mini",
    "kind": "llm"
  },
  {
    "providerId": "scaleway",
    "providerAlias": "scaleway",
    "id": "qwen3-235b-a22b-instruct-2507",
    "displayName": "Qwen3 235B",
    "kind": "llm"
  },
  {
    "providerId": "scaleway",
    "providerAlias": "scaleway",
    "id": "llama-3.3-70b-instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "scaleway",
    "providerAlias": "scaleway",
    "id": "mistral-small-3.1-24b-instruct-2503",
    "displayName": "Mistral Small 3.1",
    "kind": "llm"
  },
  {
    "providerId": "deepinfra",
    "providerAlias": "deepinfra",
    "id": "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "displayName": "Llama 3.1 70B",
    "kind": "llm"
  },
  {
    "providerId": "deepinfra",
    "providerAlias": "deepinfra",
    "id": "deepseek-ai/DeepSeek-V3",
    "displayName": "DeepSeek V3",
    "kind": "llm"
  },
  {
    "providerId": "deepinfra",
    "providerAlias": "deepinfra",
    "id": "Qwen/Qwen2.5-72B-Instruct",
    "displayName": "Qwen 2.5 72B",
    "kind": "llm"
  },
  {
    "providerId": "sambanova",
    "providerAlias": "sambanova",
    "id": "Meta-Llama-3.1-405B-Instruct",
    "displayName": "Llama 3.1 405B",
    "kind": "llm"
  },
  {
    "providerId": "sambanova",
    "providerAlias": "sambanova",
    "id": "Meta-Llama-3.1-70B-Instruct",
    "displayName": "Llama 3.1 70B",
    "kind": "llm"
  },
  {
    "providerId": "sambanova",
    "providerAlias": "sambanova",
    "id": "Meta-Llama-3.1-8B-Instruct",
    "displayName": "Llama 3.1 8B",
    "kind": "llm"
  },
  {
    "providerId": "nscale",
    "providerAlias": "nscale",
    "id": "meta-llama/Llama-3.3-70B-Instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "nscale",
    "providerAlias": "nscale",
    "id": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "displayName": "Qwen 2.5 Coder 32B",
    "kind": "llm"
  },
  {
    "providerId": "baseten",
    "providerAlias": "baseten",
    "id": "deepseek-ai/DeepSeek-R1",
    "displayName": "DeepSeek R1",
    "kind": "llm"
  },
  {
    "providerId": "baseten",
    "providerAlias": "baseten",
    "id": "meta-llama/Llama-3.3-70B-Instruct",
    "displayName": "Llama 3.3 70B",
    "kind": "llm"
  },
  {
    "providerId": "publicai",
    "providerAlias": "publicai",
    "id": "auto",
    "displayName": "Auto (Community)",
    "kind": "llm"
  },
  {
    "providerId": "nous-research",
    "providerAlias": "nous-research",
    "id": "Hermes-4-405B",
    "displayName": "Hermes 4 405B",
    "kind": "llm"
  },
  {
    "providerId": "nous-research",
    "providerAlias": "nous-research",
    "id": "Hermes-4-70B",
    "displayName": "Hermes 4 70B",
    "kind": "llm"
  },
  {
    "providerId": "glhf",
    "providerAlias": "glhf",
    "id": "hf:meta-llama/Meta-Llama-3.1-405B-Instruct",
    "displayName": "Llama 3.1 405B",
    "kind": "llm"
  },
  {
    "providerId": "glhf",
    "providerAlias": "glhf",
    "id": "hf:meta-llama/Meta-Llama-3.1-70B-Instruct",
    "displayName": "Llama 3.1 70B",
    "kind": "llm"
  },
  {
    "providerId": "glhf",
    "providerAlias": "glhf",
    "id": "hf:Qwen/Qwen2.5-72B-Instruct",
    "displayName": "Qwen 2.5 72B",
    "kind": "llm"
  },
  {
    "providerId": "deepgram",
    "providerAlias": "deepgram",
    "id": "nova-3",
    "displayName": "Nova 3",
    "kind": "stt"
  },
  {
    "providerId": "deepgram",
    "providerAlias": "deepgram",
    "id": "nova-2",
    "displayName": "Nova 2",
    "kind": "stt"
  },
  {
    "providerId": "deepgram",
    "providerAlias": "deepgram",
    "id": "whisper-large",
    "displayName": "Whisper Large",
    "kind": "stt"
  },
  {
    "providerId": "assemblyai",
    "providerAlias": "assemblyai",
    "id": "universal-3-pro",
    "displayName": "Universal 3 Pro",
    "kind": "stt"
  },
  {
    "providerId": "assemblyai",
    "providerAlias": "assemblyai",
    "id": "universal-2",
    "displayName": "Universal 2",
    "kind": "stt"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/flux/schnell",
    "displayName": "FLUX Schnell",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/flux/dev",
    "displayName": "FLUX Dev",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/flux-pro/v1.1",
    "displayName": "FLUX Pro v1.1",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/flux-pro/v1.1-ultra",
    "displayName": "FLUX Pro v1.1 Ultra",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/recraft-v3",
    "displayName": "Recraft V3",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/ideogram/v2",
    "displayName": "Ideogram V2",
    "kind": "image"
  },
  {
    "providerId": "fal-ai",
    "providerAlias": "fal-ai",
    "id": "fal-ai/stable-diffusion-v35-large",
    "displayName": "SD 3.5 Large",
    "kind": "image"
  },
  {
    "providerId": "stability-ai",
    "providerAlias": "stability-ai",
    "id": "stable-image-ultra",
    "displayName": "Stable Image Ultra",
    "kind": "image"
  },
  {
    "providerId": "stability-ai",
    "providerAlias": "stability-ai",
    "id": "stable-image-core",
    "displayName": "Stable Image Core",
    "kind": "image"
  },
  {
    "providerId": "stability-ai",
    "providerAlias": "stability-ai",
    "id": "sd3.5-large",
    "displayName": "Stable Diffusion 3.5 Large",
    "kind": "image"
  },
  {
    "providerId": "stability-ai",
    "providerAlias": "stability-ai",
    "id": "sd3.5-large-turbo",
    "displayName": "Stable Diffusion 3.5 Large Turbo",
    "kind": "image"
  },
  {
    "providerId": "stability-ai",
    "providerAlias": "stability-ai",
    "id": "sd3.5-medium",
    "displayName": "Stable Diffusion 3.5 Medium",
    "kind": "image"
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-pro-1.1",
    "displayName": "FLUX Pro 1.1",
    "kind": "image"
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-pro-1.1-ultra",
    "displayName": "FLUX Pro 1.1 Ultra",
    "kind": "image"
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-pro",
    "displayName": "FLUX Pro",
    "kind": "image"
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-dev",
    "displayName": "FLUX Dev",
    "kind": "image"
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-kontext-pro",
    "displayName": "FLUX Kontext Pro (Edit)",
    "kind": "image",
    "capabilities": [
      "edit"
    ]
  },
  {
    "providerId": "black-forest-labs",
    "providerAlias": "black-forest-labs",
    "id": "flux-kontext-max",
    "displayName": "FLUX Kontext Max (Edit)",
    "kind": "image",
    "capabilities": [
      "edit"
    ]
  },
  {
    "providerId": "recraft",
    "providerAlias": "recraft",
    "id": "recraftv3",
    "displayName": "Recraft V3",
    "kind": "image"
  },
  {
    "providerId": "recraft",
    "providerAlias": "recraft",
    "id": "recraftv2",
    "displayName": "Recraft V2",
    "kind": "image"
  },
  {
    "providerId": "runwayml",
    "providerAlias": "runwayml",
    "id": "gen4_image",
    "displayName": "Gen-4 Image",
    "kind": "image"
  },
  {
    "providerId": "runwayml",
    "providerAlias": "runwayml",
    "id": "gen4_image_turbo",
    "displayName": "Gen-4 Image Turbo",
    "kind": "image"
  },
  {
    "providerId": "runwayml",
    "providerAlias": "runwayml",
    "id": "gen4_turbo",
    "displayName": "Gen-4 Turbo",
    "kind": "video"
  },
  {
    "providerId": "runwayml",
    "providerAlias": "runwayml",
    "id": "gen3a_turbo",
    "displayName": "Gen-3 Alpha Turbo",
    "kind": "video"
  }
];

const ALIAS_TO_PROVIDER_ID = new Map<string, string>(
  Object.entries(NINE_ROUTER_PROVIDER_ALIASES).map(([providerId, alias]) => [alias, providerId]),
);

export function resolveNineRouterProviderAlias(aliasOrProviderId: string): string {
  return ALIAS_TO_PROVIDER_ID.get(aliasOrProviderId) ?? aliasOrProviderId;
}

export function nineRouterAliasForProvider(providerId: string): string {
  return (NINE_ROUTER_PROVIDER_ALIASES as Record<string, string>)[providerId] ?? providerId;
}

export function nineRouterModelsForProvider(providerIdOrAlias: string): NineRouterModelCatalogEntry[] {
  const providerId = resolveNineRouterProviderAlias(providerIdOrAlias);
  const alias = nineRouterAliasForProvider(providerId);
  return NINE_ROUTER_MODEL_CATALOG.filter((model) => model.providerId === providerId || model.providerAlias === alias);
}

export function parseNineRouterModelTarget(target: string): { providerId: string; providerAlias: string; modelId: string } | undefined {
  const slash = target.indexOf('/');
  if (slash <= 0 || slash >= target.length - 1) return undefined;
  const providerAlias = target.slice(0, slash);
  const providerId = resolveNineRouterProviderAlias(providerAlias);
  const modelId = target.slice(slash + 1);
  return { providerId, providerAlias, modelId };
}
