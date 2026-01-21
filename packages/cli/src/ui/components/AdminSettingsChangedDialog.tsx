/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { Command, keyMatchers } from '../keyMatchers.js';
import { relaunchApp } from '../../utils/processUtils.js';

export const AdminSettingsChangedDialog = () => {
  useKeypress(
    (key) => {
      if (keyMatchers[Command.RESTART_APP](key)) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        relaunchApp();
      }
    },
    { isActive: true },
  );

  const message =
    'Admin settings have changed. Please restart the session to apply new settings.';

  return (
    <Box borderStyle="round" borderColor={theme.status.warning} paddingX={1}>
      <Text color={theme.status.warning}>
        {message} Press &apos;r&apos; to restart, or &apos;Ctrl+C&apos; twice to
        exit.
      </Text>
    </Box>
  );
};
