import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from 'styled-system/jsx';
import { AppLayoutView } from './layout.tsx';

const meta = {
  title: 'Routes/AppLayoutView',
  component: AppLayoutView,
} satisfies Meta<typeof AppLayoutView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    locale: 'en',
    spacing: 'hero',
    children: <Box>Nested Route Outlet Content</Box>,
  },
};

export const Compact: Story = {
  args: {
    locale: 'fr',
    spacing: 'compact',
    children: <Box>Contenu imbriqué compact</Box>,
  },
};
