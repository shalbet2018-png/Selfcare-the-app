import { useWindowDimensions } from 'react-native';

import { BP } from './theme';

/** Which layout to use: phone (bottom tabs), tablet (icon rail) or desktop (sidebar). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const size = width >= BP.desktop ? 'desktop' : width >= BP.tablet ? 'tablet' : 'phone';
  return { width, height, size, phone: size === 'phone', wide: width >= 960 } as const;
}
