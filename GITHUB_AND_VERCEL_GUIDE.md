# Getting Your Project Online — Beginner's Guide

This guide assumes you have never used GitHub Desktop or Vercel before. No
command line required — everything here is clicking buttons in apps and
websites. It takes about 30–45 minutes the first time.

There are three parts:

1. **Upload the project to GitHub** (using the GitHub Desktop app)
2. **Deploy it to Vercel** (so it's live on the internet)
3. **Connect it to Supabase** (so it has a database)

Do them in this order — Vercel needs the GitHub upload to exist first, and
you'll need a few pieces of information from Supabase while setting up
Vercel.

---

## Before you start

Create free accounts on these three sites if you don't have them already:

- [github.com](https://github.com) — where your code will live
- [vercel.com](https://vercel.com) — where your app will actually run
- [supabase.com](https://supabase.com) — your database

And install one app:

- [desktop.github.com](https://desktop.github.com) — **GitHub Desktop**,
  a free app from GitHub that lets you upload and manage code without
  typing any commands

Also: **unzip the file you downloaded** (`interzone-lineup-manager.zip`)
into a folder somewhere easy to find, like your Desktop or Documents. Don't
leave it zipped — GitHub Desktop needs the actual folder, not the zip file.
Every step below assumes you've already unzipped it.

---

## Part 1 — Upload to GitHub using GitHub Desktop

### 1. Open GitHub Desktop and sign in

The first time you open GitHub Desktop, it will ask you to sign in to
GitHub. Do that with the account you created above.

### 2. Add the project as a local repository

The unzipped folder is already set up as a "Git repository" internally
(this was done for you), so you don't need to create a new one — you just
need to tell GitHub Desktop where it is.

1. In GitHub Desktop, go to the **File** menu → **Add Local Repository...**
2. Click **Choose...** and select the `interzone-lineup-manager` folder
   you unzipped
3. Click **Add Repository**

You should now see the project listed in GitHub Desktop, with a message
like "No local changes" — that's correct, it means everything is already
saved (committed) and ready to upload.

### 3. Publish it to GitHub

1. At the top of the GitHub Desktop window, click the **Publish
   repository** button
2. A dialog box appears:
   - **Name**: leave it as `interzone-lineup-manager` (or rename it —
     this becomes part of your GitHub URL)
   - **Description**: optional
   - **Keep this code private**: leave this **checked**. This is client
     software, not something you want publicly visible. (Vercel can
     still deploy from a private repository — that's normal and free.)
3. Click **Publish Repository**

That's it — wait a few seconds, and your code is now on GitHub. You can
confirm by clicking **View on GitHub** in GitHub Desktop, which opens the
repository in your browser.

> **Later, if you make changes:** edit files, then in GitHub Desktop
> you'll see them listed on the left as "changes." Type a short summary
> in the box at the bottom left, click **Commit to main**, then click
> **Push origin** at the top. That uploads the update. Vercel will
> automatically redeploy your site within a minute or two — you don't
> need to do anything else.

---

## Part 2 — Deploy to Vercel, step by step

### 1. Sign up / log in to Vercel with your GitHub account

Go to [vercel.com](https://vercel.com) and choose **Continue with GitHub**.
Using GitHub to sign in (instead of an email/password) is what lets Vercel
see your repositories in the next step.

### 2. Import the project

1. From your Vercel dashboard, click **Add New...** → **Project**
2. You'll see a list of your GitHub repositories. Find
   **interzone-lineup-manager** and click **Import** next to it.
   - If you don't see it, click **Adjust GitHub App Permissions** and
     grant Vercel access to that repository.
3. Vercel will show a "Configure Project" screen. It will auto-detect
   **Next.js** as the framework — you don't need to change anything in
   the Build & Output Settings section.

### 3. Add environment variables — do this before clicking Deploy

This is the step people most often forget. Scroll down to the
**Environment Variables** section on the same screen and add these five,
one at a time (type the name, type the value, click **Add**):

| Name | Where to get the value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → **anon public** key |
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` above (copy the same value again) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → **service_role** key — click "Reveal" to see it |
| `NEXT_PUBLIC_APP_URL` | Leave this as `https://placeholder.vercel.app` for now — you'll fix it in step 6 below, after Vercel gives you your real URL |

> **Don't have your Supabase project set up yet?** You need it before this
> step makes sense. See `DEPLOYMENT_CHECKLIST.md` steps 1–3 in this same
> folder — it walks through creating the Supabase project, running the
> database setup script, and creating your admin login. Come back here
> once you have those four Supabase values.

> ⚠️ The `SUPABASE_SERVICE_ROLE_KEY` is a powerful secret — it has full
> access to your database. Never share it, post it publicly, or put it
> in a file that gets uploaded to GitHub. Vercel's environment variables
> box is the right, safe place for it.

### 4. Deploy

Click the **Deploy** button. Vercel will now:

- Download your code from GitHub
- Install everything it needs
- Build the app
- Put it live on the internet

This takes 1–3 minutes. You'll see a progress screen with logs scrolling
by — that's normal. When it finishes, you'll see a **"Congratulations!"**
screen with a screenshot of your live site and a URL like
`interzone-lineup-manager.vercel.app`.

### 5. Visit your site

Click the screenshot, or the URL, to open your live app. Go to `/admin/login`
(add that to the end of the URL) and sign in with the Supabase admin
account you created earlier. If it works, you're deployed! If not, see
**Troubleshooting** at the bottom of this guide.

### 6. Fix `NEXT_PUBLIC_APP_URL` now that you have a real URL

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_APP_URL`, click the **...** menu next to it, choose
   **Edit**
3. Change the value to your actual site URL, e.g.
   `https://interzone-lineup-manager.vercel.app` (no trailing slash)
4. Save, then go to the **Deployments** tab, click the **...** menu on
   the most recent deployment, and choose **Redeploy** so the change
   takes effect

This value is used to build each coach's private link, so it needs to
match your real, live URL exactly.

### 7. (Optional) Use your own domain instead of `.vercel.app`

1. In Vercel: **Settings** → **Domains** → type your domain (e.g.
   `lineup.interzone.ht`) → **Add**
2. Vercel shows you one or two DNS records to add. Log in to wherever you
   bought the domain (GoDaddy, Namecheap, etc.), find the DNS settings,
   and add exactly what Vercel showed you
3. This can take anywhere from a few minutes to a few hours to activate
4. Once it's live, repeat step 6 above with your custom domain instead of
   the `.vercel.app` one

---

## Part 3 — One last Supabase setting

Supabase needs to know which web address is allowed to use its login
system.

1. In Supabase: **Authentication** → **URL Configuration**
2. Under **Site URL**, enter your live Vercel URL (or custom domain)
3. Under **Redirect URLs**, add the same URL
4. Save

Without this step, admin sign-in may fail on the live site even though it
worked in Vercel's build.

---

## You're done — final check

Go through the **smoke test** in `DEPLOYMENT_CHECKLIST.md` (step 8) to
confirm every part of the app works on the live site: creating a team,
opening a coach link, submitting a lineup, and exporting it.

---

## Troubleshooting

**"Repository not found" or I can't see my repo in Vercel**
Go back to GitHub → your repository → make sure Part 1 actually finished
(check the repository page loads on github.com). In Vercel, click
**Adjust GitHub App Permissions** and make sure the repository is checked.

**The Vercel build failed (red X)**
Click into the failed deployment and read the build log — scroll to the
red text. The two most common beginner causes:
- A missing or misspelled environment variable name (they must match
  exactly, including capitalization)
- You copied the wrong Supabase key into the wrong variable (the `anon`
  key and the `service_role` key are different — double-check which is
  which on the Supabase API settings page)

**The site loads but `/admin/login` won't let me sign in**
- Double-check you completed Part 3 above (Supabase URL Configuration)
- Confirm you created the admin user in Supabase → Authentication →
  Users (not just a Supabase account for yourself — that's a different
  thing)

**Coach links open but show "not found"**
Make sure you ran the full `supabase/schema.sql` script in the Supabase
SQL Editor (see `DEPLOYMENT_CHECKLIST.md` step 1) — this creates the
database tables the app needs.

**I made a change locally and it's not showing up on the live site**
In GitHub Desktop: commit your change (bottom-left box → **Commit to
main**), then click **Push origin** at the top. Vercel watches your
GitHub repository and redeploys automatically within a minute or two of
any push.
