<div align="center">
  <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/robot.svg" alt="iLEO Logo" width="80" height="80">
  <h1 align="center">iLEO AI Assistant Platform</h1>
  
  <p align="center">
    <strong>A modern, multi-tenant AI chatbot infrastructure built for scale.</strong>
    <br />
    Deploy intelligent, context-aware conversational agents to any website with a single <code>&lt;script&gt;</code> tag.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-14-black.svg?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Supabase-Database-3ecf8e.svg?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Groq-Llama_3-f55036.svg?style=flat-square" alt="Groq" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square&logo=typescript" alt="TypeScript" />
  </p>
</div>

<br />

<!-- 
  NOTE: Add your actual project GIF here! 
  Recommended size: 800px width.
-->
<div align="center">
  <img src="https://via.placeholder.com/800x450/1a1a2e/ffffff?text=Add+Project+Demo+GIF+Here" alt="iLEO Demo" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);">
</div>

<br />

## ⚡ Key Features

- **Zero-Dependency Embed:** A lightweight, vanilla JavaScript (ES5) widget that injects cleanly into any external DOM without React or package conflicts.
- **True Multi-Tenancy:** Single backend serving multiple independent environments. Each instance gets a unique `widget_id` with strict database segregation.
- **Dynamic Knowledge Retrieval:** LLM context is hydrated in real-time from Supabase based on the requesting `widget_id`.
- **Advanced State Management:** Conversation threads bridge across page refreshes ensuring seamless user experiences.
- **Action-Oriented Tool Calling:** The AI isn't just a chatter; it executes server-side tool calls (like lead capture interfaces) autonomously based on user intent.
- **Production-Grade Security:**
  - In-memory rate limiting against API abuse.
  - Granular Row Level Security (RLS) policies on Postgres.
  - Strict input sanitization and payload limits.

<br />


### The Stack
* **Framework:** Next.js (App Router)
* **Database & Auth:** Supabase (PostgreSQL + GoTrue Magic Links)
* **LLM Provider:** Groq (`llama-3.3-70b-versatile`)
* **Styling:** Tailwind CSS V4
* **Widget:** Plain Vanilla JS (`public/widget.js`)

<br />

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* A [Supabase](https://supabase.com/) Project
* A [Groq](https://groq.com/) API Key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ileo-bot.git
   cd ileo-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`.*

4. **Database Initialization**
   Execute the `supabase/schema.sql` script directly in your Supabase SQL editor to create the necessary tables (`businesses`, `knowledge_base`, `conversations`, `messages`, `leads`) and apply RLS policies.

5. **Start the Development Server**
   ```bash
   npm run dev
   ```

<br />

## 💻 The Dashboard Experience

<!-- 
  NOTE: Add screenshots of your dashboard here!
-->
<div style="display: flex; gap: 20px; justify-content: center;">
  <img src="https://via.placeholder.com/400x250/f8f9fa/333333?text=Authentication+View" alt="Auth View" width="48%">
  <img src="https://via.placeholder.com/400x250/f8f9fa/333333?text=Dashboard+Config" alt="Dashboard View" width="48%">
</div>

Project administrators can log into the secure dashboard via Passwordless Magic Links to:
1. Configure the AI's persona and operating parameters.
2. Inject raw Markdown documents into the isolated Knowledge Base.
3. Retrieve their unique `<script>` embed tag.

<br />

## 🌐 Embedding the Widget

To integrate iLEO on any website (Shopify, WordPress, custom HTML, etc.), simply place the following script before the closing `</body>` tag:

```html
<script 
  src="https://your-production-url.vercel.app/widget.js" 
  data-business-id="YOUR_UNIQUE_UUID_HERE">
</script>
```

<br />

## 🔒 Security

This application implements several layers of security:
- **CORS Policies:** Configured at the Edge to allow widget requests while protecting the main internal APIs.
- **Supabase RLS:** `SELECT/UPDATE/INSERT` actions are strictly bound to the `auth.uid()` of the authenticated session.
- **Payload Constraints:** All incoming LLM queries are truncated to prevent prompt injection and token limits exhaustion.

<br />

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
