import type { Meta, StoryObj } from '@storybook/react-vite';
import { panda } from 'styled-system/jsx';
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
    children: <panda.p>Nested Route Outlet Content</panda.p>,
  },
};

export const Compact: Story = {
  args: {
    locale: 'fr',
    spacing: 'compact',
    children: <panda.p>Contenu imbriqué compact</panda.p>,
  },
};
