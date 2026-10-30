# Selfcare — app

One codebase for **Selfcare** (clients booking self-care) and **Selfcare for Business** (salons, spas and freelancers taking bookings). It's an installable web app (PWA): it runs in any browser and installs to the home screen on phones, tablets, laptops and PCs, and works offline once loaded.

Layout adapts to the screen:

| Screen | Navigation |
| --- | --- |
| Phone (under 700 px) | Bottom tab bar |
| Tablet (700–1099 px) | Icon rail on the left |
| Laptop and desktop (1100 px and up) | Labelled sidebar; booking and profile pages go two-column |

No dependencies and no build step: plain HTML, CSS and JavaScript modules.

## Run it locally

It must be served over HTTP (modules don't load from `file://`):

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000.

## Install it on a device

Host it anywhere static (GitHub Pages: Settings → Pages → `main` / root), open the link, then:

- **Android / Chrome / Edge:** menu → Install app
- **iPhone / iPad (Safari):** Share → Add to Home Screen
- **Windows / Mac (Chrome or Edge):** install icon in the address bar

## What works in this preview

**Selfcare (client)**
- Home: categories, nearby providers, "At the shop / Come to me" toggle
- Search with filters: category, price limit, shop or home, sort by distance, price or rating
- Provider profile with service menu, hours, team and Verified badge
- Booking: shop visit (day, time, stylist) or home service (address, now or scheduled), M-Pesa / card / PayPal choice, totals with travel fee and $1 service fee
- Bookings list and booking status, with cancellation (inconvenience fee once the provider has arrived)

**Selfcare for Business** (Profile → Switch to Business, or open `#/biz`)
- Register as a business or freelancer, with permit/ID upload fields
- Verification status; online/offline switch once approved
- Incoming home-service request card: accept or decline, payout breakdown
- Upcoming jobs, earnings, payout schedule (after each service, daily, weekly)
- Services and prices you set yourself

Providers, prices and ratings are **demo data** (`js/data.js`). Bookings and business details are saved only on the device (`localStorage`). Buttons marked "Demo" stand in for things a server will do.

## Project structure

```
index.html            App shell
manifest.webmanifest  Install details (name, icons, colours)
sw.js                 Offline cache
css/app.css           All styles: phone, tablet, desktop
js/app.js             Routes and navigation
js/router.js          Hash router
js/store.js           Saved state (on device for now)
js/config.js          Fees, currency, payment and payout options
js/data.js            Demo providers and categories
js/client.js          Selfcare screens
js/business.js        Selfcare for Business screens
js/ui.js              Shared bits: icons, cards, toasts
icons/                App icons
```

## Settings to confirm

In `js/config.js`:

- `SERVICE_FEE`: the KES amount for the $1 fee
- `TRAVEL_FEE_BASE`, `TRAVEL_FEE_PER_KM`: home-service travel pricing
- `ARRIVED_CANCEL_FEE`: the inconvenience fee

## Next steps

1. **Backend and accounts:** sign-up and login for clients and providers; a real provider database replaces `js/data.js`.
2. **Payments:** M-Pesa (Safaricom Daraja STK push), card and PayPal, holding payment until the service is done, then paying providers on their chosen schedule.
3. **Verification:** secure document upload and an admin review screen.
4. **Live home service:** real-time requests to nearby providers, maps and arrival tracking.
5. **App stores:** wrap this same code with Capacitor to publish on Google Play and the App Store.

## Related

- Website: [selfcare-the-website](https://github.com/shalbet2018-png/selfcare-the-website)
