# EstimateAI — Setup Guide

---

## Before you start — install these on your computer

| Tool | Download |
|------|----------|
| Node.js 18+ | https://nodejs.org (choose LTS) |
| VS Code | https://code.visualstudio.com |
| Git | https://git-scm.com |

Check Node is installed: open a terminal and run `node --version` — should say v18 or higher.

---

## Step 1 — Create free accounts

Open each link, sign up, and keep the tab open. You'll grab keys from each one.

| Service | Link | What for |
|---------|------|----------|
| Neon | https://neon.tech | PostgreSQL database |
| Pinecone | https://pinecone.io | Vector search (AI memory) |
| Anthropic | https://console.anthropic.com | Claude API key |
| OpenAI | https://platform.openai.com | Embeddings (cheap — ~$1/mo) |
| Vercel | https://vercel.com | Hosting + file storage |

---

## Step 2 — Neon database

1. Log into neon.tech → **New project** → name it `estimateai`
2. Click your project → **Connection details**
3. Copy the **Connection string** — looks like:
   `postgresql://alex:password@ep-xxx.neon.tech/neondb?sslmode=require`
4. Save it — this is your `DATABASE_URL`

---

## Step 3 — Pinecone vector index

1. Log into pinecone.io → **Create index**
2. Settings:
   - **Name:** `construction-docs`
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
   - **Cloud:** AWS / us-east-1 (free tier)
3. Go to **API Keys** → copy your key → save as `PINECONE_API_KEY`

---

## Step 4 — Anthropic API key

1. Log into console.anthropic.com
2. **API Keys** → **Create key**
3. Copy it → save as `ANTHROPIC_API_KEY`

---

## Step 5 — OpenAI API key

1. Log into platform.openai.com
2. **API keys** → **Create new secret key**
3. Copy it → save as `OPENAI_API_KEY`

---

## Step 6 — Azure AD (Microsoft employee login)

This is the login step. If your company has an IT admin, forward them this section.

1. Go to https://portal.azure.com
2. Search **"App registrations"** → **New registration**
3. Fill in:
   - Name: `EstimateAI`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI type: **Web**
   - Redirect URI: `http://localhost:3000/api/auth/nextauth/callback/azure-ad`
4. Click **Register**
5. From the Overview page, copy:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. Go to **Certificates & secrets** → **New client secret** → copy the **Value** → `AZURE_AD_CLIENT_SECRET`
7. Go to **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated** → add `openid`, `profile`, `email` → click **Grant admin consent**

---

## Step 7 — Run the app locally

Open a terminal, navigate to the `estimateai` folder, then run:

```bash
# 1. Install all packages (takes 1-2 minutes)
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Copy the env template
cp .env.example .env.local
```

Open `.env.local` in VS Code and fill in every value:

```
DATABASE_URL=           ← from Step 2
NEXTAUTH_SECRET=        ← run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_URL=           http://localhost:3000
AZURE_AD_CLIENT_ID=     ← from Step 6
AZURE_AD_CLIENT_SECRET= ← from Step 6
AZURE_AD_TENANT_ID=     ← from Step 6
ANTHROPIC_API_KEY=      ← from Step 4
OPENAI_API_KEY=         ← from Step 5
PINECONE_API_KEY=       ← from Step 3
PINECONE_INDEX=         construction-docs
ALLOWED_EMAIL_DOMAIN=   yourcompany.com
```

Push the database tables to Neon:

```bash
npx prisma db push
```

Start the app:

```bash
npm run dev
```

Open http://localhost:3000 — you should see the login screen.

---

## Step 8 — Add Vercel Blob (file storage)

1. Push your code to a GitHub repo
2. Import the repo on vercel.com
3. In your Vercel project → **Storage** → **Connect Store** → **Blob** → create store named `project-docs`
4. Run locally:
   ```bash
   npx vercel env pull .env.local
   ```
   This adds `BLOB_READ_WRITE_TOKEN` to your local env file automatically.

---

## Step 9 — Deploy to production

```bash
npx vercel --prod
```

Or just push to GitHub — Vercel auto-deploys on every push.

**Add all your env variables in Vercel dashboard:**
Settings → Environment Variables → add each one from your `.env.local`

**Add production redirect URI in Azure:**
Azure Portal → App registrations → your app → Authentication → add:
`https://your-app.vercel.app/api/auth/nextauth/callback/azure-ad`

---

## Step 10 — Upload your first document and test

1. Log in with your Microsoft company email
2. Click **Documents** in the sidebar
3. Upload a PDF or Excel project file
4. Wait ~30 seconds for status to change to **Ready**
5. Go to **Chat** and ask about the project

---

## Troubleshooting

**Login fails / redirect error**
→ Double-check the redirect URI in Azure matches exactly, including the `/nextauth/` part

**Document stuck on Processing**
→ Check Vercel logs → usually means `OPENAI_API_KEY` or `PINECONE_API_KEY` is wrong

**"Couldn't find that in the uploaded documents"**
→ Make sure document status is Ready (not Processing or Failed)
→ Try rephrasing — the AI searches semantically, not by exact keyword

**Database connection timeout on first request**
→ Neon free tier pauses after inactivity — it wakes up within 5 seconds, just retry

---

## Running costs (50 employees, active use)

| | Monthly |
|--|--|
| Claude API (chat) | $50–150 |
| OpenAI (embeddings on upload) | $1–3 |
| Neon PostgreSQL | Free up to 3 GB |
| Pinecone | Free up to 100K vectors |
| Vercel | Free → $20 |
| **Total** | **~$50–175** |

ChatGPT Team for 50 people = $1,500/month.
