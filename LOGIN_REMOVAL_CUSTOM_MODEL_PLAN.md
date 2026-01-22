# OpenAI Provider and Login Removal Plan

## Goals
- Remove all Google login/auth flows so the CLI can run without any login UX.
- Use the OpenAI SDK for model access with user-configurable model settings.
- Enable tool calling by default for the custom model provider.

## Non-Goals (for the first pass)
- Preserve Google OAuth, Gemini API key, or Vertex AI flows.
- Maintain Google Code Assist and its remote experiments.
- Add support for multiple providers beyond OpenAI in this change.

## Proposed Configuration
- Add provider selection to settings:
  - `model.provider`: "openai" (default).
- Add OpenAI settings under `model.openai`:
  - `apiKey` (fallback to `OPENAI_API_KEY`).
  - `baseUrl` (fallback to `OPENAI_BASE_URL`, for custom endpoints).
  - `model` (fallback to `OPENAI_MODEL`).
  - `embeddingModel` (fallback to `OPENAI_EMBEDDING_MODEL`).
  - `headers` (optional map for extra headers).
  - `timeoutMs` and `maxRetries` (optional).
  - `toolsEnabled` (default true).
  - `toolChoice` (optional override, default "auto").

## Core Design Changes
1) OpenAI content generator
   - Implement `OpenAIContentGenerator` to satisfy the existing `ContentGenerator` interface.
   - Use the OpenAI SDK for chat completions, streaming, and embeddings.
   - Translate internal Gemini-style requests to OpenAI messages/tools:
     - `systemInstruction` -> system message.
     - Gemini `contents` -> OpenAI messages (user/assistant/tool).
     - `tools.functionDeclarations` -> OpenAI `tools`.
     - `functionResponse` parts -> OpenAI tool messages.
   - Convert OpenAI responses back into `GenerateContentResponse`:
     - Emit `content.parts[].text` for assistant output.
     - Map `tool_calls` to `functionCall` parts and set `functionCalls` for schedulers.
     - Normalize finish reasons and usage metadata.

2) Provider-based initialization
   - Replace `AuthType`/`refreshAuth` with provider config, e.g. `initializeContentGenerator()`.
   - Initialize the content generator during startup without any login step.
   - Ensure `BaseLlmClient` uses OpenAI embeddings; disable classifier routing if embeddings are unavailable.

3) Remove Google auth and Code Assist
   - Delete or bypass all OAuth flows, auth dialogs, and `/auth` commands.
   - Remove Google-specific configuration validation and telemetry fields.
   - Drop Code Assist experiments and admin controls that depend on Google auth.

## CLI / UI Changes
- Remove the auth state machine and related screens (`ui/auth/*`).
- Strip `/auth` command and tips referencing login.
- Update settings schema and config loading to pass OpenAI settings.
- Replace non-interactive auth validation with OpenAI config validation.

## Session and Telemetry Updates
- Replace `authType` in checkpoints with `provider` (ignore legacy `authType` on load).
- Update telemetry to report provider instead of Google auth type.

## Migration Notes
- Existing sessions with `authType` should continue to load, but `authType` will be ignored.
- Settings fields under `security.auth` can be deprecated or removed after this change.

## Implementation Plan
Phase 1 - Core provider layer
- Add provider config types and OpenAI settings in core config.
- Implement `OpenAIContentGenerator` and wire it into `createContentGenerator`.
- Update token counting and embeddings to use OpenAI.

Phase 2 - CLI startup and configuration
- Update settings schema with `model.provider` and `model.openai`.
- Replace auth validation with OpenAI config validation.
- Remove `performInitialAuth` and any auth gating in startup.

Phase 3 - UI cleanup and commands
- Remove auth dialogs, `/auth` command, and related tests.
- Simplify `AppContainer` and session resume logic.

Phase 4 - Telemetry, sessions, and docs
- Update telemetry fields for provider.
- Update checkpoint schema.
- Refresh docs with OpenAI config examples.

## Risks / Edge Cases
- Tool calling translation must match the scheduler expectations.
- Streaming deltas need to align with the CLI's incremental rendering.
- Some Gemini-only features (preview models, Code Assist experiments) must be disabled for OpenAI.

## Validation
- Unit tests for OpenAI request/response mapping (text, tools, tool calls, tool responses).
- Smoke test in CLI with `OPENAI_API_KEY` + custom `model.openai.model`.
