import type { CSSProperties, PropsWithChildren } from 'react';

export type ChipColorsType = 'red' | 'yellow' | 'orange' | 'blue' | 'indigo' | 'default' | 'green' | 'grey' | 'pink' | 'custom';

export type ChipSizeType = 'sm' | 'md' | 'lg';

export type ChipVariant = 'subtle' | 'solid';

export interface ChipProps extends PropsWithChildren {
  value?: string | number | boolean;
  onRemove?: (value: string | number | boolean) => void;
  removeAriaLabel?: string;
  color?: ChipColorsType;
  /** Extra classes appended after the color classes; only guaranteed to take effect with color="custom". */
  colorClassName?: string;
  style?: CSSProperties;
  className?: string;
  size?: ChipSizeType;
  /** Visual style. Defaults to "subtle". */
  variant?: ChipVariant;
}
