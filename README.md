# Supabase Setup Guide for Smart Lost & Found Portal

Follow these quick steps to hook up your Supabase project in under 2 minutes:

## 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organization, give it a name (e.g. `smart-lost-found`), and choose a strong database password.

## 2. Execute the Database Schema
1. In your Supabase project dashboard, navigate to the **SQL Editor** (left menu icon).
2. Click **New Query**.
3. Copy all the SQL from [`supabase/schema.sql`](./schema.sql) and paste it into the editor.
4. Click **Run** (or `Ctrl+Enter`).
   - This sets up the tables: `profiles`, `items`, `claims`, `notifications`.
   - Enables Row Level Security (RLS) policies.
   - Sets up triggers for auto-profiling and instant notification delivery.
   - Configures the `lost-found-images` storage bucket.

## 3. Retrieve API Credentials
1. Go to **Project Settings** (gear icon) -> **API**.
2. Copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon / public key** (e.g., `eyJhbGciOi...`)

## 4. Plug Credentials into the App
You can connect in either of two easy ways:
- **Option A (Via App UI)**: Launch the app, click the **Settings / Cloud** icon in the header, paste your Project URL and Anon Key, and click **Connect**.
- **Option B (Via File)**: Open [`js/config.js`](../js/config.js) and enter your values:
  ```javascript
  export const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_REF.supabase.co',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
  };
  ```

## 5. Enable Storage Public Access (if not automatic)
1. In the Supabase dashboard, click **Storage**.
2. Confirm the `lost-found-images` bucket exists and is toggled to **Public**.

That's it! Your backend is fully wired with real-time auth, PostgreSQL RLS security, and storage.
