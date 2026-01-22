/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Newline, Text } from 'ink';
import { type Config } from '@google/gemini-cli-core';
import { theme } from '../semantic-colors.js';
import { useKeypress } from '../hooks/useKeypress.js';

interface PrivacyNoticeProps {
  onExit: () => void;
  config: Config;
}

const PrivacyNoticeText = ({ onExit }: { onExit: () => void }) => {
  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        onExit();
      }
    },
    { isActive: true },
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={theme.text.accent}>
        Model Provider Notice
      </Text>
      <Newline />
      <Text color={theme.text.primary}>
        This CLI uses the configured model provider and your supplied API
        credentials. Please review your provider&apos;s terms of service and
        data handling policies.
      </Text>
      <Newline />
      <Text color={theme.text.secondary}>Press Esc to exit.</Text>
    </Box>
  );
};

export const PrivacyNotice = ({ onExit, config: _config }: PrivacyNoticeProps) => (
  <Box borderStyle="round" padding={1} flexDirection="column">
    <PrivacyNoticeText onExit={onExit} />
  </Box>
);
