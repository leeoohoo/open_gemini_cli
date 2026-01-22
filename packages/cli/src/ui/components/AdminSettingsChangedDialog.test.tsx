/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderWithProviders } from '../../test-utils/render.js';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as processUtils from '../../utils/processUtils.js';
import { act } from 'react';
import { AdminSettingsChangedDialog } from './AdminSettingsChangedDialog.js';

describe('AdminSettingsChangedDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    const { lastFrame } = renderWithProviders(<AdminSettingsChangedDialog />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('restarts on "r" key press', async () => {
    const relaunchAppSpy = vi.spyOn(processUtils, 'relaunchApp');
    const { stdin } = renderWithProviders(<AdminSettingsChangedDialog />);

    act(() => {
      stdin.write('r');
    });

    expect(relaunchAppSpy).toHaveBeenCalledTimes(1);
  });

  it.each(['r', 'R'])('restarts on "%s" key press', async (key) => {
    const relaunchAppSpy = vi.spyOn(processUtils, 'relaunchApp');
    const { stdin } = renderWithProviders(<AdminSettingsChangedDialog />);

    act(() => {
      stdin.write(key);
    });

    expect(relaunchAppSpy).toHaveBeenCalledTimes(1);
  });
});
