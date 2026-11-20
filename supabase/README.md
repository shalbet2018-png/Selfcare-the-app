# Selfcare backend (Supabase)

Until these steps are done, the app runs on built-in demo data, the same as before. Once the two keys are in `.env.local`, it switches to real accounts and listings.

## What works now

- **Sign in with email.** Selfcare emails a 6-digit code. New emails get an account automatically.
- **Businesses register for real.** They pick a name, main service, area and travel radius, and upload their verification documents to private storage. Then they submit for review.
- **Services and prices** are saved to the database.
- **Online status and payout schedule** are saved too.
- **Clients only see approved providers** in Home, Search and provider pages. A provider needs at least one service to show up.

These still live on the device for now: bookings, and the demo job requests on the business dashboard. They are the next slice.

## One-time setup (about 10 minutes)

1. **Create the project.** Sign up at [supabase.com](https://supabase.com) and create a new project. The free plan is fine. Pick the region closest to Nairobi, for example `eu-west` or `eu-central`.
2. **Create the tables and rules.** In the dashboard, open **SQL Editor**, then **New query**. Paste all of [`schema.sql`](schema.sql) and click **Run**. It is safe to run again after edits.
3. **Connect an email sender.** Supabase locks the email templates until you use your own sender (SMTP). We use [Resend](https://resend.com):
   - In Resend, create an API key with **Sending access**.
   - In Supabase, open **Authentication**, then **Emails**, then **SMTP Settings**, and turn on custom SMTP. Host `smtp.resend.com`, port `465`, username `resend`, password: the Resend key. Sender name `Selfcare`.
   - Sender email: an address on a domain you have verified in Resend. Without a verified domain, use `onboarding@resend.dev`; Resend then only delivers to your own Resend account's email, which is fine for testing but not for customers.
4. **Make the sign-in emails contain the code.** Open **Authentication**, then **Emails**, then **Templates**, and edit **both** of these (click **Source** to edit the body):
   - **Confirm sign up**: sent the first time an email address signs in.
   - **Magic link or OTP**: sent every time after that.

   Set the subject to `Your Selfcare code` and the body to something like:

   ```html
   <h2>Your Selfcare code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>It expires in 1 hour. If you did not ask for it, ignore this email.</p>
   ```

   Without `{{ .Token }}` the email only has a link, and the app needs the code.
5. **Connect the app.** Open **Project Settings**, then **API Keys**. Copy `.env.example` to `.env.local` in the app folder and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`: the project URL
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key, starting `sb_publishable_`. Never put the secret key in the app.
6. **Restart the dev server** (`npx expo start`) so it picks up the new values.

### Email limits

Supabase's built-in email sender is only for testing. It sends a handful of emails per hour. Before real users arrive, add your own email sender under **Authentication**, then **Emails**, then **SMTP settings**. Resend, Brevo or SendGrid all work, and each has a free tier.

## Approving a provider

There is no admin screen yet. To approve a business, open the **SQL Editor** and run:

```sql
-- See who is waiting
select id, name, kind, area, verification, created_at from public.providers order by created_at desc;

-- Approve one
update public.providers set verification = 'approved' where id = '<provider id>';

-- Or ask for changes. The provider sees the note in the app and can resubmit.
update public.providers set verification = 'rejected' where id = '<provider id>';
update public.provider_private set review_note = 'The permit photo is blurry. Please upload a clearer one.' where provider_id = '<provider id>';
```

Their documents are in **Storage**, in the **provider-documents** bucket, in a folder named after their user id.

## Web and app-store builds

The GitHub Actions builds do not have these keys, so they still produce demo builds. That is the right default until you are ready to go live. Add the two values as repository secrets later to make the builds connect.
