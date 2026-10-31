import Constants from 'expo-constants';

/**
 * Which app this build is: the Selfcare client app or Selfcare for Business.
 * Set at build time with APP_VARIANT=business (see app.config.js).
 */
export const VARIANT: 'client' | 'business' =
  Constants.expoConfig?.extra?.variant === 'business' ? 'business' : 'client';

export const IS_BUSINESS_APP = VARIANT === 'business';
