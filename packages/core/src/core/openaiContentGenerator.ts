/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { FinishReason, GenerateContentResponse } from '@google/genai';
import type {
  Content,
  Part,
  FunctionCall,
  GenerateContentConfig,
  GenerateContentParameters,
  GenerateContentResponseUsageMetadata,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  FunctionDeclaration,
} from '@google/genai';
import { randomUUID } from 'node:crypto';
import { estimateTokenCountSync } from '../utils/tokenCalculation.js';
import { partListUnionToString } from './geminiRequest.js';
import { toContents } from '../code_assist/converter.js';
import type {
  ContentGenerator,
  OpenAIProviderSettings,
} from './contentGenerator.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

type OpenAIToolCallAccumulator = {
  id?: string;
  name?: string;
  args: string;
};

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function isAssistantRole(role: string | undefined): boolean {
  return role === 'model' || role === 'assistant';
}

function normalizeSystemInstruction(
  systemInstruction: GenerateContentConfig['systemInstruction'],
): string | undefined {
  if (!systemInstruction) {
    return undefined;
  }

  if (typeof systemInstruction === 'string') {
    return systemInstruction;
  }

  if (Array.isArray(systemInstruction)) {
    return partListUnionToString(systemInstruction);
  }

  if ('parts' in systemInstruction) {
    return partListUnionToString(systemInstruction.parts ?? []);
  }

  return partListUnionToString(systemInstruction as Part | Part[]);
}

function summarizeFunctionResponse(response: unknown): string {
  if (!response) {
    return '';
  }

  if (typeof response === 'string') {
    return response;
  }

  if (typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const output = record['output'];
    if (typeof output === 'string') {
      return output;
    }
  }

  return JSON.stringify(response);
}

function partToText(part: Part): string {
  if (typeof part.text === 'string') {
    return part.text;
  }

  const inlineData = 'inlineData' in part ? part.inlineData : undefined;
  const fileData = 'fileData' in part ? part.fileData : undefined;
  const mimeType = inlineData?.mimeType || fileData?.mimeType;
  if (mimeType) {
    return `[${mimeType} content omitted]`;
  }

  if ('functionCall' in part && part.functionCall) {
    return `[Function call: ${part.functionCall.name}]`;
  }

  if ('functionResponse' in part && part.functionResponse) {
    return `[Function response: ${part.functionResponse.name}]`;
  }

  return '';
}

function parseToolArguments(args: string): Record<string, unknown> {
  if (!args) {
    return {};
  }
  try {
    const parsed = JSON.parse(args) as Record<string, unknown>;
    return parsed ?? {};
  } catch (_error) {
    return { _raw: args };
  }
}

function normalizeEmbeddingInput(
  contents: EmbedContentParameters['contents'],
): string[] {
  if (typeof contents === 'string') {
    return [contents];
  }
  if (Array.isArray(contents)) {
    return contents.map((item) =>
      typeof item === 'string' ? item : JSON.stringify(item),
    );
  }
  return [JSON.stringify(contents)];
}

function mapFinishReason(
  finishReason?: string | null,
): FinishReason | undefined {
  if (!finishReason) {
    return undefined;
  }

  switch (finishReason) {
    case 'stop':
      return FinishReason.STOP;
    case 'length':
      return FinishReason.MAX_TOKENS;
    case 'content_filter':
      return FinishReason.SAFETY;
    case 'tool_calls':
      return FinishReason.STOP;
    default:
      return FinishReason.STOP;
  }
}

function normalizeOpenAiSchema(
  schema: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return { type: 'object', properties: {} };
  }

  const normalized: Record<string, unknown> = { ...schema };
  const schemaType = normalized['type'];

  if (schemaType === 'object') {
    return normalized;
  }

  if (schemaType == null) {
    normalized['type'] = 'object';
    return normalized;
  }

  if (Array.isArray(schemaType) && schemaType.includes('object')) {
    normalized['type'] = 'object';
    return normalized;
  }

  return { type: 'object', properties: {} };
}

function toOpenAiTools(
  tools: GenerateContentConfig['tools'],
): OpenAI.ChatCompletionTool[] {
  const functionDeclarations: FunctionDeclaration[] = [];
  for (const tool of tools ?? []) {
    if (!tool) {
      continue;
    }
    if (
      'functionDeclarations' in tool &&
      Array.isArray(tool.functionDeclarations)
    ) {
      functionDeclarations.push(...tool.functionDeclarations);
    }
  }

  return functionDeclarations
    .filter((decl) => typeof decl.name === 'string' && decl.name.length > 0)
    .map((decl) => ({
      type: 'function',
      function: {
        name: decl.name!,
        description: decl.description,
        parameters: normalizeOpenAiSchema(
          (decl.parametersJsonSchema ?? decl.parameters ?? {}) as
            | Record<string, unknown>
            | undefined,
        ),
      },
    }));
}

function resolveToolChoice(
  config: GenerateContentConfig | undefined,
  openai: OpenAIProviderSettings,
): OpenAI.ChatCompletionToolChoiceOption | undefined {
  if (openai.toolChoice) {
    if (typeof openai.toolChoice === 'string') {
      return openai.toolChoice as OpenAI.ChatCompletionToolChoiceOption;
    }
    if ('name' in openai.toolChoice) {
      return {
        type: 'function',
        function: { name: openai.toolChoice.name },
      } as OpenAI.ChatCompletionToolChoiceOption;
    }
    return undefined;
  }

  const mode = config?.toolConfig?.functionCallingConfig?.mode;
  if (!mode) {
    return undefined;
  }

  switch (mode) {
    case 'AUTO':
      return 'auto';
    case 'NONE':
      return 'none';
    case 'ANY':
      return 'required' as OpenAI.ChatCompletionToolChoiceOption;
    default:
      return undefined;
  }
}

function buildMessages(
  contents: Content[],
  systemInstruction?: GenerateContentConfig['systemInstruction'],
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  const systemText = normalizeSystemInstruction(systemInstruction);
  if (systemText) {
    messages.push({ role: 'system', content: systemText });
  }

  for (const content of contents) {
    const parts = content.parts ?? [];
    const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
    const textParts: string[] = [];

    for (const part of parts) {
      if (part.functionResponse) {
        const responseText = summarizeFunctionResponse(
          part.functionResponse.response,
        );
        const callId =
          part.functionResponse.id || `call_${randomUUID().slice(0, 8)}`;
        messages.push({
          role: 'tool',
          tool_call_id: callId,
          content: responseText,
        });
        continue;
      }

      if (part.functionCall?.name) {
        const callId =
          part.functionCall.id || `call_${randomUUID().slice(0, 8)}`;
        toolCalls.push({
          id: callId,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args ?? {}),
          },
        });
        continue;
      }

      const text = partToText(part);
      if (text) {
        textParts.push(text);
      }
    }

    const text = textParts.join('');
    if (toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls,
      });
      continue;
    }

    if (!text) {
      continue;
    }

    if (isAssistantRole(content.role)) {
      messages.push({ role: 'assistant', content: text });
    } else {
      messages.push({ role: 'user', content: text });
    }
  }

  return messages;
}

function buildResponse(
  message: OpenAI.ChatCompletionMessage,
  finishReason: FinishReason | undefined,
  responseId?: string,
  usage?: OpenAIUsage,
): GenerateContentResponse {
  const parts: Part[] = [];

  if (message.content) {
    parts.push({ text: message.content });
  }

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const call of message.tool_calls) {
      const name = call.function?.name;
      if (!name) {
        continue;
      }
      const args = parseToolArguments(call.function.arguments || '');
      const functionCall: FunctionCall = {
        id: call.id,
        name,
        args,
      };
      parts.push({ functionCall });
    }
  }

  const usageMetadata: GenerateContentResponseUsageMetadata | undefined = usage
    ? {
    promptTokenCount: usage.prompt_tokens,
    candidatesTokenCount: usage.completion_tokens,
    totalTokenCount: usage.total_tokens,
      }
    : undefined;
  const response = new GenerateContentResponse();
  response.responseId = responseId;
  response.candidates = [
    {
      content: {
        role: 'model',
        parts,
      },
      finishReason,
    },
  ];
  response.usageMetadata = usageMetadata;
  return response;
}

export class OpenAIContentGenerator implements ContentGenerator {
  private readonly client: OpenAI;
  private readonly openai: OpenAIProviderSettings;

  constructor(openai: OpenAIProviderSettings) {
    this.openai = openai;
    this.client = new OpenAI({
      apiKey: openai.apiKey,
      baseURL: openai.baseUrl || DEFAULT_BASE_URL,
      defaultHeaders: openai.headers,
      maxRetries: openai.maxRetries,
      timeout: openai.timeoutMs,
    });
  }

  private getModelFromRequest(request: GenerateContentParameters): string {
    return request.model || this.openai.model || 'gpt-4o-mini';
  }

  private getEmbeddingModel(): string {
    return this.openai.embeddingModel || 'text-embedding-3-large';
  }

  private buildChatRequest(
    request: GenerateContentParameters,
  ): OpenAI.ChatCompletionCreateParamsNonStreaming {
    const model = this.getModelFromRequest(request);
    const config = request.config;
    const messages = buildMessages(
      toContents(request.contents),
      config?.systemInstruction,
    );
    const tools = toOpenAiTools(config?.tools);
    const toolsEnabled = this.openai.toolsEnabled ?? true;
    const toolChoice = resolveToolChoice(config, this.openai);

    const requestParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
      temperature: config?.temperature,
      top_p: config?.topP,
      max_tokens: config?.maxOutputTokens,
      stop: config?.stopSequences,
      frequency_penalty: config?.frequencyPenalty,
      presence_penalty: config?.presencePenalty,
      seed: config?.seed,
    };

    if (config?.responseJsonSchema) {
      requestParams.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'response_schema',
          schema: config.responseJsonSchema as Record<string, unknown>,
        },
      };
    } else if (config?.responseMimeType === 'application/json') {
      requestParams.response_format = { type: 'json_object' };
    }

    if (toolsEnabled && tools.length > 0) {
      requestParams.tools = tools;
      if (toolChoice) {
        requestParams.tool_choice = toolChoice;
      }
    } else {
      requestParams.tool_choice = 'none';
    }

    return requestParams;
  }

  private buildRequestOptions(
    request: GenerateContentParameters,
  ): OpenAI.RequestOptions | undefined {
    const signal = request.config?.abortSignal;
    return signal ? { signal } : undefined;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const requestParams = this.buildChatRequest(request);
    const requestOptions = this.buildRequestOptions(request);
    const response = await this.client.chat.completions.create(
      requestParams,
      requestOptions,
    );
    const choice = response.choices[0];
    const finishReason = mapFinishReason(choice.finish_reason);

    return buildResponse(
      choice.message,
      finishReason,
      response.id,
      response.usage,
    );
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const requestParams = this.buildChatRequest(request);
    const requestOptions = this.buildRequestOptions(request);
    const streamParams: OpenAI.ChatCompletionCreateParamsStreaming = {
      ...requestParams,
      stream: true,
      stream_options: { include_usage: true },
    };
    const stream = await this.client.chat.completions.create(
      streamParams,
      requestOptions,
    );

    const toolCalls: Map<number, OpenAIToolCallAccumulator> = new Map();
    let finishReason: FinishReason | undefined;
    let responseId: string | undefined;
    let usage: OpenAIUsage | undefined;

    async function* iterate(): AsyncGenerator<GenerateContentResponse> {
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        responseId = chunk.id;

        if (choice.finish_reason) {
          finishReason = mapFinishReason(choice.finish_reason);
        }

        if (chunk.usage) {
          usage = chunk.usage;
        }

        const delta = choice.delta;
        const parts: Part[] = [];
        if (delta?.content) {
          parts.push({ text: delta.content });
        }

        if (delta?.tool_calls && delta.tool_calls.length > 0) {
          for (const call of delta.tool_calls) {
            const existing = toolCalls.get(call.index) ?? {
              id: call.id,
              name: call.function?.name,
              args: '',
            };
            if (call.id) {
              existing.id = call.id;
            }
            if (call.function?.name) {
              existing.name = call.function.name;
            }
            if (call.function?.arguments) {
              existing.args += call.function.arguments;
            }
            toolCalls.set(call.index, existing);
          }
        }

        if (parts.length > 0) {
          const chunk = new GenerateContentResponse();
          chunk.responseId = responseId;
          chunk.candidates = [
            {
              content: {
                role: 'model',
                parts,
              },
            },
          ];
          yield chunk;
        }
      }

      const finalParts: Part[] = [];
      for (const call of toolCalls.values()) {
        if (!call.name) {
          continue;
        }
        const functionCall: FunctionCall = {
          id: call.id ?? `call_${randomUUID().slice(0, 8)}`,
          name: call.name,
          args: parseToolArguments(call.args),
        };
        finalParts.push({ functionCall });
      }

      const usageMetadata: GenerateContentResponseUsageMetadata | undefined =
        usage
          ? {
              promptTokenCount: usage.prompt_tokens,
              candidatesTokenCount: usage.completion_tokens,
              totalTokenCount: usage.total_tokens,
            }
          : undefined;

      const finalFinishReason = finishReason ?? FinishReason.STOP;

      const finalResponse = new GenerateContentResponse();
      finalResponse.responseId = responseId;
      finalResponse.candidates = [
        {
          content: {
            role: 'model',
            parts: finalParts,
          },
          finishReason: finalFinishReason,
        },
      ];
      finalResponse.usageMetadata = usageMetadata;
      yield finalResponse;
    }

    return iterate();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const contents = toContents(request.contents);
    const parts = contents.flatMap((content) => content.parts ?? []);
    const totalTokens = estimateTokenCountSync(parts);
    return { totalTokens };
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const model = request.model || this.getEmbeddingModel();
    const input = normalizeEmbeddingInput(request.contents);
    const response = await this.client.embeddings.create({
      model,
      input,
    });

    return {
      embeddings: response.data.map((item) => ({
        values: item.embedding,
      })),
    };
  }
}
