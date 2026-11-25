# Seppeler Gabelstapler-Disponent: free hosting setup

The app runs without Lovable:

- **The app itself** is hosted free on **GitHub Pages**, at `https://YOUR-GITHUB-NAME.github.io/REPO-NAME/`.
- **The database, logins and alerts** run on your own free **Supabase** project.
- Every time you push to `main`, GitHub rebuilds and redeploys both automatically.

Everything below is done in a web browser. No Mac and no installs are needed.

---

## 1. Create the Supabase project (about 5 minutes)

1. Go to https://supabase.com and sign up (free), then click **New project**.
   Name it `seppeler`, choose a strong database password, and pick region **Central EU (Frankfurt)**.
2. When it's ready, open **SQL Editor → New query**. Paste the whole contents of `supabase/schema.sql` and click **Run**.
3. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://YOUR-GITHUB-NAME.github.io/REPO-NAME/`
   - **Redirect URLs:** add the same address.
4. Go to **Authentication → Sign In / Providers → Email**. Turn **Confirm email** on or off as you prefer. It only affects admin sign-ups, because drivers use usernames.
5. Note down these three values:
   - **Project ref:** the short ID in the dashboard URL (`supabase.com/dashboard/project/<ref>`).
   - **Project URL** and **Publishable key:** under **Project Settings → API Keys** (also in **Connect**).
6. Create an access token at https://supabase.com/dashboard/account/tokens. Click **Generate new token** and copy it.

## 2. Add the secrets to GitHub

In your repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | the token from step 1.6 |
| `SUPABASE_PROJECT_REF` | the project ref |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable key (`sb_publishable_…`) |
| `VAPID_SEED` | any long random text (30+ characters). Never change it later, or phones must re-enable alerts. |
| `CRON_SECRET` | another long random text |
| `DEEPL_API_KEY` | *optional*: a free key from https://www.deepl.com/pro-api, used to translate orders for EN/PL/RO drivers. Without it, drivers see the German text. |

## 3. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Then open the **Actions** tab, choose **Deploy → Run workflow** (or push any change). After about 2 minutes, the app is live at the address shown in the run.

## 4. Turn on the "order open for 30 minutes" alert

Open `supabase/cron.sql` and replace `YOUR-PROJECT-REF` and `YOUR-CRON-SECRET` with your values. Then run it in the Supabase **SQL Editor**.

## 5. First login

The **first account created becomes the owner/admin**, so sign up yourself first using **Admin** mode. Drivers then register with **Fahrer** (a username and password, no e-mail). Admins who register later have to be approved by an existing admin.

> The old data in Lovable (accounts, orders) does not carry over. Everyone registers once in the new app.

## 6. On the iPhone

1. Open the GitHub Pages address in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open the app **from the home-screen icon**, sign in, and tap **"Ton & Benachrichtigungen aktivieren"**. Then allow notifications.

Push alerts on a locked iPhone need iOS 16.4 or newer and only work from the home-screen icon, not from a Safari tab.

---

### Costs and limits

- GitHub Pages is free for public repositories.
- The Supabase free plan covers this easily (500 MB database, 500k function calls per month). A free project **pauses after 7 days with no activity at all**. Normal daily use prevents this, and you can un-pause it in the dashboard.
- The DeepL free tier allows 500,000 characters per month.

### Where things live

- `src/`: the app (same screens and logic as the Lovable version)
- `supabase/functions/`: server jobs (driver signup, admin password reset, push alerts, translation, 30-minute alert)
- `supabase/schema.sql`: database tables, security rules and functions
- `.github/workflows/deploy.yml`: automatic deployment
