import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorBoundaryView } from './error-boundary.tsx';

const meta = {
  title: 'Components/ErrorBoundaryView',
  component: ErrorBoundaryView,
  args: {
    boundary: 'route:home',
    error: new Error('Database connection timed out'),
    locale: 'en',
  },
} satisfies Meta<typeof ErrorBoundaryView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RouteError: Story = {};

export const RootErrorFrench: Story = {
  args: {
    boundary: 'root',
    error: new Error('Échec critique du serveur'),
    locale: 'fr',
  },
};

export const SectionError: Story = {
  args: {
    boundary: 'section:home-hero',
    error: 'Unexpected payload shape',
    locale: 'en',
  },
};
