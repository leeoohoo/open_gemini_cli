/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { Config as CoreConfig } from '@google/gemini-cli-core';
import {
  AuthType,
  createContentGeneratorConfig,
} from '@google/gemini-cli-core';
import { OpenAIContentGenerator } from '@google/gemini-cli-core/src/core/openaiContentGenerator.js';
import {
  getSettingsSchema,
  createTestMergedSettings,
} from '../config/settings.js';
import { loadCliConfig, parseArguments } from '../config/config.js';
import { ExtensionManager } from '../config/extension-manager.js';

const openaiMocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  createEmbedding: vi.fn(),
}));

vi.mock('openai', () => ({
    default: class OpenAI {
      chat = { completions: { create: openaiMocks.createChatCompletion } };
      embeddings = { create: openaiMocks.createEmbedding };
      constructor(_options: unknown) {}
    },
  }));

vi.mock('../config/trustedFolders.js', () => ({
  isWorkspaceTrusted: vi.fn(() => ({ isTrusted: true, source: 'test' })),
}));

vi.mock('../config/sandboxConfig.js', () => ({
  loadSandboxConfig: vi.fn(async () => undefined),
}));

const repoRoot = path.resolve(__dirname, '../../../../');

const protectedFiles = [
  {
    path: path.join(repoRoot, 'packages/cli/src/config/settingsSchema.ts'),
    marker: "default: 'openai'",
  },
  {
    path: path.join(repoRoot, 'packages/cli/src/config/config.ts'),
    marker: "const modelProvider = settings.model?.provider ?? 'openai';",
  },
  {
    path: path.join(repoRoot, 'packages/core/src/core/contentGenerator.ts'),
    marker: "config.getModelProvider?.() ?? (authType ? 'google' : 'openai');",
  },
];

const originalArgv = process.argv;

beforeEach(() => {
  vi.spyOn(ExtensionManager.prototype, 'loadExtensions').mockResolvedValue(
    undefined,
  );
});

afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  openaiMocks.createChatCompletion.mockReset();
  openaiMocks.createEmbedding.mockReset();
});

describe('Multi-model compatibility', () => {
  describe('Provider configuration', () => {
    it('uses OpenAI as the default provider in settings schema', () => {
      const schema = getSettingsSchema();
      const provider = schema.model?.properties?.provider;

      expect(provider?.default).toBe('openai');
      expect(provider?.options?.map((option) => option.value)).toContain(
        'openai',
      );
    });
  });

  describe('Model parsing in config.ts', () => {
    it('resolves OpenAI model and embedding settings from configuration', async () => {
      process.argv = ['node', 'script.js'];
      const settings = createTestMergedSettings({
        experimental: { jitContext: true },
        model: {
          provider: 'openai',
          openai: {
            apiKey: 'test-openai-key',
            model: 'gpt-4o-mini',
            embeddingModel: 'text-embedding-3-small',
          },
        },
      });

      const argv = await parseArguments(settings);
      const config = await loadCliConfig(settings, 'test-session', argv);

      expect(config.getModelProvider()).toBe('openai');
      expect(config.getModel()).toBe('gpt-4o-mini');
      expect(config.getEmbeddingModel()).toBe('text-embedding-3-small');
      expect(config.getOpenAISettings()?.apiKey).toBe('test-openai-key');
    });

    it('prefers OPENAI_MODEL environment variable over settings', async () => {
      vi.stubEnv('OPENAI_MODEL', 'env-openai-model');
      process.argv = ['node', 'script.js'];
      const settings = createTestMergedSettings({
        experimental: { jitContext: true },
        model: {
          provider: 'openai',
          openai: {
            model: 'settings-openai-model',
          },
        },
      });

      const argv = await parseArguments(settings);
      const config = await loadCliConfig(settings, 'test-session', argv);

      expect(config.getModel()).toBe('env-openai-model');
    });
  });

  describe('Provider selection in contentGenerator', () => {
    it('defaults to OpenAI when provider is unset and no auth type is supplied', async () => {
      const stubConfig = {
        getModelProvider: () => undefined,
        getProxy: () => undefined,
        getOpenAISettings: () => ({ apiKey: 'test-key' }),
        getModel: () => 'gpt-4o-mini',
        getEmbeddingModel: () => 'text-embedding-3-large',
      } as unknown as CoreConfig;

      const generatorConfig = await createContentGeneratorConfig(
        stubConfig,
        undefined,
      );

      expect(generatorConfig.provider).toBe('openai');
    });

    it('chooses Google provider when auth type is set and provider is unset', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
      const stubConfig = {
        getModelProvider: () => undefined,
        getProxy: () => undefined,
        getOpenAISettings: () => ({ apiKey: 'test-key' }),
        getModel: () => 'gemini-2.0',
        getEmbeddingModel: () => 'text-embedding-004',
      } as unknown as CoreConfig;

      const generatorConfig = await createContentGeneratorConfig(
        stubConfig,
        AuthType.USE_GEMINI,
      );

      expect(generatorConfig.provider).toBe('google');
      expect(generatorConfig.apiKey).toBe('test-gemini-key');
    });
  });

  describe('OpenAI content generator', () => {
    it('creates a response from OpenAI chat completion output', async () => {
      openaiMocks.createChatCompletion.mockResolvedValue({
        id: 'chat-test',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello from OpenAI' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 7,
          total_tokens: 12,
        },
      });

      const generator = new OpenAIContentGenerator({
        apiKey: 'test-openai-key',
      });

      const response = await generator.generateContent(
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Say hello.' }],
            },
          ],
        },
        'prompt-id',
      );

      const [request] = openaiMocks.createChatCompletion.mock.calls[0] ?? [];
      expect(request).toEqual(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        }),
      );
      expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Hello from OpenAI',
      );
    });
  });

  describe('Configuration integrity', () => {
    it('keeps key configuration files present and intact', () => {
      for (const target of protectedFiles) {
        const contents = fs.readFileSync(target.path, 'utf8');
        expect(contents.length).toBeGreaterThan(0);
        expect(contents).toContain(target.marker);
      }
    });
  });
});
