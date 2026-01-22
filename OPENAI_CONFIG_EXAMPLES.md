# OpenAI Configuration Examples

This file shows example settings and environment variables for the OpenAI provider.

## Settings example (settings.json)
```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o-mini",
    "openai": {
      "apiKey": "sk-your-key",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o-mini",
      "embeddingModel": "text-embedding-3-large",
      "headers": {
        "X-Client": "gemini-cli"
      },
      "timeoutMs": 30000,
      "maxRetries": 2,
      "toolsEnabled": true,
      "toolChoice": "auto"
    }
  }
}
```

## Minimal settings + env vars
Use settings for provider selection and rely on environment variables for credentials.

```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o-mini"
  }
}
```

## Environment variables
### Bash / zsh
```bash
export OPENAI_API_KEY="sk-your-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4o-mini"
export OPENAI_EMBEDDING_MODEL="text-embedding-3-large"
```

### PowerShell
```powershell
$env:OPENAI_API_KEY = "sk-your-key"
$env:OPENAI_BASE_URL = "https://api.openai.com/v1"
$env:OPENAI_MODEL = "gpt-4o-mini"
$env:OPENAI_EMBEDDING_MODEL = "text-embedding-3-large"
```
