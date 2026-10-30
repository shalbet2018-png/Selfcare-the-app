# Selfcare — app

One codebase for **Selfcare** (clients booking self-care) and **Selfcare for Business** (salons, spas and freelancers taking bookings), built with [Expo](https://expo.dev) (SDK 58, React Native, Expo Router).

It runs on:

| Device | How |
| --- | --- |
| Android phones and tablets | Expo Go now; Play Store build with EAS |
| iPhone and iPad | Expo Go now; App Store build with EAS |
| Laptops and PCs | In the browser (web build) |

The layout adapts to the screen: a bottom tab bar on phones (under 700 px), an icon rail on tablets, and a labelled sidebar on laptops and desktops (1100 px and up). Booking and profile pages go two-column on wide screens. Tablets work in portrait and landscape.

## Run it

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npx expo start
```

Then:

- **Phone or tablet:** install **Expo Go** from the Play Store or App Store and scan the QR code in the terminal.
- **Laptop or PC:** press `w` to open it in your browser.

Other commands:

```bash
npm run typecheck      # TypeScript
npx expo lint          # lint
npm run export:web     # static web build into dist/
```

## What works in this preview

**Selfcare (client)**
- Home: categories, nearby providers, "At the shop / Come to me" toggle
- Search with filters: category, price limit, shop or home, sort by distance, price or rating
- Provider profile with service menu, hours, team and Verified badge
- Booking: shop visit (day, time, stylist) or home service (address, now or scheduled), M-Pesa / card / PayPal choice, totals with travel fee and $1 service fee
- Bookings list and status tracker, with cancellation (inconvenience fee once the provider has arrived)

**Selfcare for Business** (Profile → Switch to Business)
- Register as a business or freelancer and choose permit/ID files
- Verification status; online/offline switch once approved
- Incoming home-service request: accept or decline, payout breakdown
- Upcoming jobs, earnings, payout schedule (after each service, daily, weekly)
- Services and prices you set yourself

Providers, prices and ratings are **demo data** (`src/lib/data.ts`). Bookings and business details are saved only on the device. Buttons marked "Demo" stand in for things a server will do.

## Project structure

```
src/app/                 Screens (Expo Router: each file is a route)
  _layout.tsx            Fonts, saved data, responsive navigation
  index.tsx              Home
  search.tsx             Search and filters
  provider/[id].tsx      Provider profile
  book/[providerId]/[serviceId].tsx   Booking
  bookings.tsx, booking/[id].tsx      Bookings and status
  profile.tsx
  biz/                   Selfcare for Business: dashboard, register, services, account
src/components/          Nav, background and bubbles, buttons, cards, inputs
src/lib/                 config (fees), data (demo), store (saved state), theme, layout
assets/images/           App icon, Android adaptive icon, splash, favicon
```

## Settings to confirm

In `src/lib/config.ts`:

- `SERVICE_FEE`: the KES amount for the $1 fee
- `TRAVEL_FEE_BASE`, `TRAVEL_FEE_PER_KM`: home-service travel pricing
- `ARRIVED_CANCEL_FEE`: the inconvenience fee

In `app.json`, `ios.bundleIdentifier` and `android.package` are placeholders (`com.selfcare.app`); pick your own before the first store build.

## Next steps

1. **Backend and accounts:** sign-up and login for clients and providers; a real provider database replaces the demo data.
2. **Payments:** M-Pesa (Safaricom Daraja STK push), card and PayPal; hold payment until the service is done, then pay providers on their chosen schedule.
3. **Verification:** secure document upload and an admin review screen.
4. **Live home service:** real-time requests to nearby providers, maps, arrival tracking and push notifications.
5. **Store builds:** `npx eas-cli@latest build` for Android and iOS (needs a free Expo account).

The earlier no-install web version of the app is kept on the `pwa-preview` branch.

## Related

- Website: [selfcare-the-website](https://github.com/shalbet2018-png/selfcare-the-website)
