# Seppeler Gabelstapler-Disponent: free hosting setup

The app runs without Lovable:

- **The app itself** is hosted free on **GitHub Pages**, at `https://victoras3113.github.io/Steppler/`.
- **The database, logins and alerts** run on a free **Supabase** project.
- Every push to `main` redeploys both automatically (`.github/workflows/deploy.yml`).

## One-time setup

1. **Create the Supabase project** (free) at supabase.com. Pick region Central EU (Frankfurt).
2. **Set up the database:** open the SQL Editor, paste all of `supabase/schema.sql`, and click Run. This also creates random server secrets (push keys, cron password) in the private `app_secrets` table, so you don't have to make any.
3. **Set the address:** go to Authentication → URL Configuration and set the Site URL and a Redirect URL to `https://victoras3113.github.io/Steppler/`.
4. **Fill in `.env.production`** with the Project URL and the Publishable key (Project Settings → API Keys). Both are public by design.
5. **Add one GitHub secret:** go to Settings → Secrets and variables → Actions and add **`SUPABASE_ACCESS_TOKEN`**. You create the token at https://supabase.com/dashboard/account/tokens.
6. **Turn on GitHub Pages:** go to Settings → Pages and set Source to **GitHub Actions**. Then on the Actions tab, run Deploy.
7. **Turn on the 30-minute alert:** put your project ref into `supabase/cron.sql`, then run it in the SQL Editor.
8. **Optional translation** for EN/PL/RO drivers: get a free DeepL key at deepl.com/pro-api, then run
   `insert into public.app_secrets(name, value) values ('deepl_api_key', 'YOUR-KEY:fx');`

## First login

The **first account created becomes the owner/admin**, so sign up in **Admin** mode first. Only this main account can approve or decline later admin sign-ups. Drivers register with **Fahrer** (a username and password, no e-mail).

Old data from Lovable does not carry over.

## On the iPhone

1. Open the app's address in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open the app from that icon, sign in, and tap **"Ton & Benachrichtigungen aktivieren"**.

Push alerts on a locked phone need iOS 16.4 or newer and only work from the home-screen icon.

## Limits

- GitHub Pages is free for public repositories.
- On the Supabase free plan, a project **pauses after 7 days with no activity at all**. Daily use prevents this.
