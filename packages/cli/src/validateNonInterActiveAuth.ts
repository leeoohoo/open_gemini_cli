/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '@google/gemini-cli-core';
import type { LoadedSettings } from './config/settings.js';

/**
 * Deprecated: authentication is no longer required for provider-based configs.
 * This is kept for backward compatibility in tests.
 */
export async function validateNonInteractiveAuth(
  _configuredAuthType: unknown,
  _useExternalAuth: boolean | undefined,
  _nonInteractiveConfig: Config,
  _settings: LoadedSettings,
): Promise<undefined> {
  return undefined;
}
