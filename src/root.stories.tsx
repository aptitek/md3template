import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from 'styled-system/jsx';
import { AppShell } from './root.tsx';

const meta: Meta<typeof AppShell> = {
  title: 'Application/AppShell',
  component: AppShell,
};

export default meta;

type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: <Box>MD3 Application Shell</Box>,
  },
};
