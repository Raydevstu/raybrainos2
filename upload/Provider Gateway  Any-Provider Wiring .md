Upgrade CortexOS provider system into a real provider-gateway abstraction.

The UI must support any provider easily:
- Gemini
- OpenAI
- Anthropic
- DeepSeek
- OpenRouter
- Groq
- Ollama local
- custom OpenAI-compatible endpoint
- custom Anthropic Messages endpoint
- custom Responses API endpoint

Do not call providers directly from random components.

Create:
- lib/provider-gateway.ts
- lib/model-router.ts
- lib/provider-types.ts

Provider type:
- id
- name
- type:
  - account
  - api-key
  - custom-endpoint
  - local
- baseUrl
- apiMode:
  - auto
  - chat-completions
  - responses
  - anthropic-messages
  - ollama
- apiKeyRef
- connected
- health:
  - online
  - offline
  - degraded
  - unknown
- models

Model profile:
- id
- name
- mainModel
- fallbackModels
- auxiliaryModel
- perAgentOverrides
- contextWindowOverride
- temperature
- maxTokens

Agent model routing:
- MainBrain → strong reasoning model
- Librarian → fast extraction model
- Discovery → research model
- Product → reasoning/writing model
- Design → vision/UX model
- Architecture → reasoning/code model
- Development → coding model
- QA → testing/security model
- Release → ops/code model

Settings UI:
- Providers > Accounts
- Providers > API Keys
- Providers > Custom Endpoints
- Providers > Local Models
- Model > Main Model
- Model > Fallback Models
- Model > Auxiliary Models
- Model > Per-Agent Routing

Custom endpoint form:
- name
- provider id
- endpoint URL
- API mode
- default model
- context window
- API key reference placeholder

Security:
- Never store raw API keys in localStorage.
- In demo mode, store only key reference label.
- Real mode must call server-side gateway route.
- Add comments and adapter boundaries for future server implementation.

Routing:
- All agent commands go through modelRouter.
- modelRouter selects provider/model based on agent profile.
- If primary provider offline, fallback chain is shown in activity feed.
- In demo mode, simulate fallback visibly.
- In real mode, structure request payload for backend.

Acceptance:
- Adding custom endpoint updates provider list.
- Per-agent model override updates agent chip.
- Disconnecting provider causes fallback event.
- No component directly imports Gemini SDK.
- No raw API key persists client-side.