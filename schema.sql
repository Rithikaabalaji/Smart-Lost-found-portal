-- ====================================================================
-- Smart Lost & Found Management Portal - Supabase PostgreSQL Schema
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default 'Anonymous User',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Items Table (Lost & Found posts)
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('lost', 'found')),
  title text not null,
  description text not null,
  category text not null check (category in (
    'Electronics', 'Wallets & Bags', 'Keys', 'IDs & Cards',
    'Clothing & Accessories', 'Pets', 'Documents & Books', 'Jewelry', 'Other'
  )),
  location text not null,
  item_date date not null default current_date,
  image_url text,
  contact_info text,
  status text not null default 'open' check (status in ('open', 'pending_claim', 'resolved')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Claims Table
-- Table fields: id, item_id, claimant_id, message, status
create table if not exists public.claims (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  claimant_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Notifications Table
-- Table fields: id, user_id, message, read_at
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  read_at timestamptz,
  link_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.claims enable row level security;
alter table public.notifications enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." 
  on public.profiles for select using (true);

create policy "Users can update their own profile." 
  on public.profiles for update using (auth.uid() = id);

-- Items Policies
create policy "Items are viewable by everyone." 
  on public.items for select using (true);

create policy "Authenticated users can create items." 
  on public.items for insert with check (auth.uid() = user_id);

create policy "Users can update their own items." 
  on public.items for update using (auth.uid() = user_id);

create policy "Users can delete their own items." 
  on public.items for delete using (auth.uid() = user_id);

-- Claims Policies
create policy "Item posters and claimants can view related claims." 
  on public.claims for select using (
    auth.uid() = claimant_id 
    or auth.uid() in (select user_id from public.items where id = claims.item_id)
  );

create policy "Authenticated users can submit a claim." 
  on public.claims for insert with check (auth.uid() = claimant_id);

create policy "Item posters can update claim status." 
  on public.claims for update using (
    auth.uid() in (select user_id from public.items where id = claims.item_id)
  );

-- Notifications Policies
create policy "Users can view their own notifications." 
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notification read status." 
  on public.notifications for update using (auth.uid() = user_id);

-- ====================================================================
-- AUTOMATED TRIGGERS & FUNCTIONS
-- ====================================================================

-- A. Profile auto-creation when a user registers via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/initials/svg?seed=' || coalesce(new.email, 'User'))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- B. Trigger: Automatically send notification when a claim is filed
create or replace function public.handle_new_claim()
returns trigger as $$
declare
  item_record record;
  claimant_record record;
begin
  select title, user_id into item_record from public.items where id = new.item_id;
  select full_name into claimant_record from public.profiles where id = new.claimant_id;

  -- Notify item owner
  insert into public.notifications (user_id, message, link_url)
  values (
    item_record.user_id,
    coalesce(claimant_record.full_name, 'Someone') || ' submitted a claim on your item: "' || item_record.title || '"',
    '#claims'
  );
  
  -- Update item status to pending_claim if currently open
  update public.items set status = 'pending_claim' where id = new.item_id and status = 'open';

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_claim_created on public.claims;
create trigger on_claim_created
  after insert on public.claims
  for each row execute function public.handle_new_claim();

-- C. Trigger: Automatically send notification when a claim is approved or rejected
create or replace function public.handle_claim_status_change()
returns trigger as $$
declare
  item_record record;
begin
  if old.status <> new.status then
    select title into item_record from public.items where id = new.item_id;
    
    insert into public.notifications (user_id, message, link_url)
    values (
      new.claimant_id,
      'Your claim for "' || item_record.title || '" was marked as ' || upper(new.status) || '.',
      '#claims'
    );

    -- If approved, resolve the item
    if new.status = 'approved' then
      update public.items set status = 'resolved' where id = new.item_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_claim_status_change on public.claims;
create trigger on_claim_status_change
  after update on public.claims
  for each row execute function public.handle_claim_status_change();

-- ====================================================================
-- STORAGE BUCKET CONFIGURATION (Run in Supabase SQL editor)
-- ====================================================================
insert into storage.buckets (id, name, public) 
values ('lost-found-images', 'lost-found-images', true)
on conflict (id) do nothing;

create policy "Item images are publicly accessible."
  on storage.objects for select using (bucket_id = 'lost-found-images');

create policy "Authenticated users can upload item images."
  on storage.objects for insert with check (
    bucket_id = 'lost-found-images' and auth.role() = 'authenticated'
  );
