import type { Meta, StoryObj } from '@storybook/react-vite';
import { resolveA11yString } from '../i18n/strings.ts';
import { HomeView } from './home.tsx';

const meta: Meta<typeof HomeView> = {
  title: 'Routes/HomeView',
  component: HomeView,
};

export default meta;

type Story = StoryObj<typeof HomeView>;

export const English: Story = {
  args: {
    title: resolveA11yString('en', 'appTitle'),
    description: resolveA11yString('en', 'appDescription'),
    locale: 'en',
  },
};

export const French: Story = {
  args: {
    title: resolveA11yString('fr', 'appTitle'),
    description: resolveA11yString('fr', 'appDescription'),
    locale: 'fr',
  },
};
