import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type CustomWebElementProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  readonly variant?: string;
  readonly disabled?: boolean;
  readonly value?: string;
  readonly label?: string;
  readonly type?: string;
  readonly name?: string;
  readonly href?: string;
  readonly target?: string;
  readonly selected?: boolean;
  readonly open?: boolean;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-card': CustomWebElementProps;
      'm3e-button': CustomWebElementProps;
      'm3e-icon-button': CustomWebElementProps;
      'm3e-fab': CustomWebElementProps;
      'm3e-text-field': CustomWebElementProps;
      'm3e-checkbox': CustomWebElementProps;
      'm3e-switch': CustomWebElementProps;
      'm3e-dialog': CustomWebElementProps;
      'md-filled-button': CustomWebElementProps;
      'md-outlined-button': CustomWebElementProps;
      'md-text-button': CustomWebElementProps;
      'md-elevated-button': CustomWebElementProps;
      'md-filled-tonal-button': CustomWebElementProps;
      'md-icon-button': CustomWebElementProps;
      'md-fab': CustomWebElementProps;
      'md-filled-text-field': CustomWebElementProps;
      'md-outlined-text-field': CustomWebElementProps;
      'md-checkbox': CustomWebElementProps;
      'md-switch': CustomWebElementProps;
      'md-radio': CustomWebElementProps;
      'md-dialog': CustomWebElementProps;
      'md-list': CustomWebElementProps;
      'md-list-item': CustomWebElementProps;
      'md-divider': CustomWebElementProps;
      'md-Elevation': CustomWebElementProps;
      'md-ripple': CustomWebElementProps;
    }
  }
}
