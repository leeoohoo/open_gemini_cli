/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { describe, it, expect, vi } from 'vitest';
import { PrivacyNotice } from './PrivacyNotice.js';
import type { Config } from '@google/gemini-cli-core';

vi.mock('../hooks/useKeypress.js', () => ({
  useKeypress: () => {},
}));

describe('PrivacyNotice', () => {
  it('renders the provider notice text', () => {
    const mockConfig = {} as Config;
    const onExit = vi.fn();

    const { lastFrame } = render(
      <PrivacyNotice config={mockConfig} onExit={onExit} />,
    );

    const output = lastFrame();
    expect(output).toContain('Model Provider Notice');
    expect(output).toContain('Press Esc to exit.');
  });
});
