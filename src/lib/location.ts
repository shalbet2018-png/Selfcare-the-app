// Reading the device's location, only when someone taps a button, and distances between points.
import * as Location from 'expo-location';

export type Point = { lat: number; lng: number };

/** Asks permission if needed, then reads the location once (to about 100 m). Throws a sentence a person can act on. */
export async function getDeviceLocation(): Promise<Point> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error(perm.canAskAgain
      ? 'Location was not shared. Tap the button again and allow location.'
      : 'Location is turned off for Selfcare. Turn it on in your phone settings, then try again.');
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    throw new Error('Could not find your location. Check that location is on, then try again.');
  }
}

/** Straight-line distance in km (same formula as private.km_between in the database). */
export function kmBetween(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Rounded to 0.1 km, the way bookings store it. */
export const roundKm = (km: number) => Math.round(km * 10) / 10;
