# Comment Automation

Self-hosted Instagram comment-to-DM automation. Free alternative to ManyChat's Comment Growth Tool.

**Flow:** User comments a keyword → bot publicly replies → bot DMs them with a quick-reply button → they tap it → bot sends the link.

---

## 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial.sql`
3. Copy from **Project Settings → API**:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Meta Developer App

**Prerequisites**

- Instagram Business or Creator account
- A Facebook Page connected to that Instagram account
- Meta Developer App at [developers.facebook.com](https://developers.facebook.com)

**Required permissions (add via App Review or in Development mode)**

- `instagram_manage_comments`
- `instagram_manage_messages`
- `pages_messaging`

**Get your credentials**

- `IG_ACCESS_TOKEN` — a long-lived Page access token scoped to your Instagram account
- `IG_APP_SECRET` — App Secret from **App Settings → Basic**
- `IG_ACCOUNT_ID` — numeric Instagram Business Account ID (found in Instagram settings or via Graph API)

**Configure the webhook** *(after deploying to Vercel)*

1. In your Meta App → **Webhooks → Instagram**
2. Set Callback URL: `https://your-app.vercel.app/api/webhook`
3. Set Verify Token: any random string you choose — save it as `IG_VERIFY_TOKEN`
4. Subscribe to fields: `comments` and `messages`

> The app must be in **Live mode** to receive events from real accounts. Development mode works for test accounts added under App Roles.

---

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```
IG_ACCESS_TOKEN=          # Long-lived page access token
IG_VERIFY_TOKEN=          # Your chosen verify token (any random string)
IG_APP_SECRET=            # App Secret from Meta dashboard
IG_ACCOUNT_ID=            # Numeric Instagram Business Account ID
SUPABASE_URL=             # https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=# service_role key from Supabase
```

---

## 4. Deploy to Vercel

```bash
# Install Vercel CLI (once)
npm i -g vercel

# From the project root
vercel --prod
```

Then add the same six env vars in **Vercel → Project → Settings → Environment Variables**.

---

## 5. Dashboard

Visit `https://your-app.vercel.app/dashboard` to:

- Add / edit / delete keywords
- Toggle keywords on or off without deleting them
- See openers sent, links sent, and CTR per keyword

### Keyword fields

| Field | Description |
|-------|-------------|
| **Trigger keyword** | The word/phrase to match (case-insensitive, substring). Leave blank to match any comment. |
| **Public reply variants** | One variant per line — the bot picks one at random for the public comment reply. |
| **Private opener text** | The first DM sent after matching. Includes a "Send me the link" quick-reply button. |
| **Button label** | Text on the final link button (e.g. `Get the guide`). Max ~20 chars. |
| **Link URL** | The URL sent in the final DM. |
| **Closing text** | Text above the link button in the final DM. |

---

## Platform limits to know

- **Private reply window** — `recipient.comment_id` only works within **7 days** of the original comment. Comments older than that cannot receive a private reply initiation.
- **Button template** — The `web_url` button in the final DM requires the user to be within the 24-hour messaging window (tapping the quick-reply satisfies this).
- **API version** — Currently using `v22.0` (`lib/instagram.js`). Bump the `VERSION` constant there when Meta releases a newer stable version.
- **Deduplication** — Meta retries webhook deliveries on non-2xx responses. The `processed_events.comment_id` unique constraint prevents double-sends regardless.
