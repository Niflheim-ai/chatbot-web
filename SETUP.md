# n8n Chatbot Setup Guide

Complete setup instructions for the n8n-powered chatbot with Supabase integration.

## 📋 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: React + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Automation**: n8n (Webhook)
- **Deployment**: Vercel

## 🎯 Project Goal

Create a chatbot where:
1. User types a message in the UI
2. Message is sent to Next.js API route
3. API forwards message to n8n Webhook
4. n8n processes the message (calls AI model)
5. n8n returns response
6. Response is displayed in UI
7. Messages are stored in Supabase

## 📁 Project Structure

```
chatbot-web/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts       # API route for chat
│   ├── favicon.ico
│   ├── globals.css            # Tailwind + custom styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main chat UI
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser Supabase client
│       └── server.ts          # Server Supabase client
├── public/
├── .env.local                 # Environment variables (not committed)
├── .env.local.example         # Template for env vars
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── SETUP.md                   # This file
├── tailwind.config.ts
└── tsconfig.json
```

## 🔑 Environment Variables Setup

### Step 1: Create `.env.local` file

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

### Step 2: Get Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep this secret!

### Step 3: Get n8n Webhook URL

1. In your n8n workflow (see n8n Setup section below)
2. Click on the Webhook node
3. Copy the **Production URL**
4. Paste into `N8N_WEBHOOK_URL`

Your `.env.local` should look like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/chatbot
```

### Step 4: Add to Vercel (for deployment)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all four variables
5. Redeploy your app

## 🗄️ Supabase Setup

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Click **New Project**
3. Choose organization, project name, database password, and region
4. Wait for project provisioning (~2 minutes)

### Step 2: Create `messages` Table

1. In your Supabase project, go to **Table Editor**
2. Click **New Table**
3. Configure:
   - **Name**: `messages`
   - **Enable Row Level Security (RLS)**: ✅ Yes

4. Add columns:

| Name | Type | Default Value | Options |
|------|------|---------------|----------|
| id | int8 | Auto-increment | Primary Key |
| role | text | - | Not null |
| content | text | - | Not null |
| created_at | timestamptz | now() | Not null |

5. Click **Save**

### Step 3: Configure Row Level Security (RLS)

1. Go to **Authentication** → **Policies**
2. Find the `messages` table
3. Click **New Policy**
4. Use this SQL for public inserts:

```sql
CREATE POLICY "Allow inserts for all"
ON public.messages
FOR INSERT
TO public
WITH CHECK (true);
```

Or use the visual editor:
- **Policy name**: Allow inserts for all
- **Allowed operation**: INSERT
- **Target roles**: public
- **USING expression**: `true`

### Step 4: Verify Connection

Test your Supabase connection by running the app locally (see "How to Run Locally" section).

## 🤖 n8n Setup

### Step 1: Create n8n Account

Choose one:

**Option A: n8n Cloud (Recommended for beginners)**
1. Go to [n8n.io](https://n8n.io/)
2. Sign up for free account
3. Create new workflow

**Option B: Self-Hosted**
1. Use Docker: `docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n`
2. Access at `http://localhost:5678`

### Step 2: Create Webhook Workflow

1. In n8n, click **+ New Workflow**
2. Name it: "Chatbot Webhook"

### Step 3: Add Webhook Trigger

1. Click **Add first step** → **Trigger** → **Webhook**
2. Configure:
   - **HTTP Method**: POST
   - **Path**: `chatbot` (or any path you prefer)
   - **Response Mode**: Last Node
3. Copy the **Production URL** (looks like: `https://xxx.app.n8n.cloud/webhook/chatbot`)
4. Paste this into your `.env.local` as `N8N_WEBHOOK_URL`

### Step 4: Add AI Processing Node

**For Testing (Simple Echo Bot)**:

1. Add **Code** node
2. Paste this JavaScript:

```javascript
const message = $input.item.json.message;

return {
  reply: `You said: ${message}`
};
```

**For Real AI (OpenAI/Groq/etc.)**:

1. Add **HTTP Request** node
2. Configure for your AI API:
   - **Method**: POST
   - **URL**: `https://api.openai.com/v1/chat/completions` (or Groq, etc.)
   - **Authentication**: Bearer Token
   - **Headers**: `Content-Type: application/json`
   - **Body**:

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "{{ $json.message }}"
    }
  ]
}
```

3. Add another **Code** node to format response:

```javascript
const aiResponse = $input.item.json.choices[0].message.content;

return {
  reply: aiResponse
};
```

### Step 5: Test the Webhook

1. Click **Test workflow** in n8n
2. Use a tool like Postman or curl:

```bash
curl -X POST https://your-n8n-webhook-url/webhook/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello n8n"}'
```

Expected response:

```json
{
  "reply": "You said: Hello n8n"
}
```

3. If successful, click **Activate** workflow in n8n

## 🔐 Security Best Practices

1. **Never expose service role key** - Only use in server-side code (`route.ts`, `server.ts`)
2. **Validate all inputs** - API route checks for empty messages
3. **Use timeouts** - API has 15-second timeout for n8n calls
4. **Enable RLS** - Supabase Row Level Security protects your data
5. **Rate limiting** (optional) - Add middleware to prevent abuse:

```typescript
// middleware.ts (optional)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const now = Date.now();
  const limit = 10; // requests
  const window = 60000; // per minute

  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter((time: number) => now - time < window);

  if (recentRequests.length >= limit) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);

  return NextResponse.next();
}

export const config = {
  matcher: '/api/chat',
};
```

## 🧠 Overall Process Flow

```
User types message
     ↓
[Chat UI - page.tsx]
     ↓
   POST /api/chat
     ↓
[API Route - route.ts]
     ↓
  Validates input
     ↓
Calls n8n Webhook (with timeout)
     ↓
[n8n Workflow]
     ↓
Processes with AI
     ↓
Returns { reply: "..." }
     ↓
[API Route - route.ts]
     ↓
Saves to Supabase (user + bot messages)
     ↓
Returns { reply: "..." } to frontend
     ↓
[Chat UI - page.tsx]
     ↓
Displays bot message bubble
```

## 🚀 How to Run Locally

### Prerequisites

- Node.js 18+ installed
- npm or pnpm or yarn
- Supabase project created
- n8n workflow activated

### Steps

1. **Clone the repository**:

```bash
git clone https://github.com/Niflheim-ai/chatbot-web.git
cd chatbot-web
```

2. **Install dependencies**:

```bash
npm install
```

3. **Setup environment variables**:

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual keys
```

4. **Run development server**:

```bash
npm run dev
```

5. **Open browser**:

Visit [http://localhost:3000](http://localhost:3000)

6. **Test the chatbot**:

- Type a message
- Click "Send"
- See the response from n8n
- Check Supabase Table Editor to see stored messages

## 🎨 Optional Features

### Typing Indicator ✅

Already included! Shows animated dots while waiting for response.

### Conversation History

Add this to load previous messages on page load:

```typescript
// In page.tsx
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect } from "react";

useEffect(() => {
  async function loadHistory() {
    const { data } = await supabaseBrowser
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      const formatted = data.map((msg, idx) => ({
        id: idx,
        role: msg.role as "user" | "bot",
        content: msg.content
      }));
      setMessages(formatted);
    }
  }
  loadHistory();
}, []);
```

### Dark Mode ✅

Already dark by default! To add light mode toggle, use `next-themes`.

### Authentication

Use Supabase Auth to require login:

```typescript
// lib/supabase/auth.ts
import { supabaseBrowser } from "./client";

export async function signIn(email: string, password: string) {
  return await supabaseBrowser.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return await supabaseBrowser.auth.signUp({ email, password });
}

export async function signOut() {
  return await supabaseBrowser.auth.signOut();
}
```

## 🐛 Troubleshooting

### "N8N_WEBHOOK_URL is not set" error

- Check `.env.local` exists and has the URL
- Restart dev server after adding env vars

### n8n timeout errors

- Verify n8n workflow is **Activated**
- Test webhook directly with curl
- Check n8n logs for errors

### Supabase insert failures

- Verify RLS policy allows inserts
- Check service role key is correct
- View Supabase logs in Dashboard → Logs

### Messages not displaying

- Open browser DevTools → Console for errors
- Check Network tab for failed API calls
- Verify API route is returning `{ reply: "..." }`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🎉 You're Done!

Your n8n-powered chatbot is now ready to use. Start chatting and watch the magic happen!

For questions or issues, check the troubleshooting section or open an issue on GitHub.