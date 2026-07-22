#!/usr/bin/env node
/**
 * Bootstraps the first Super Admin account.
 *
 * Usage:
 *   node scripts/create-admin.mjs --email admin@zarghoonjewellers.com --password "StrongPass123!" --name "Shop Owner"
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (e.g. `export $(cat .env.local | xargs)` first, or run with
 * `npx dotenv -e .env.local -- node scripts/create-admin.mjs ...`).
 */
import { createClient } from "@supabase/supabase-js";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

const email = arg("email");
const password = arg("password");
const name = arg("name", "Admin");
const role = arg("role", "super_admin");

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs --email <email> --password <password> [--name \"Full Name\"] [--role super_admin]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create auth user:", error.message);
  process.exit(1);
}

const { error: profileError } = await supabase.from("admin_profiles").insert({
  id: data.user.id,
  full_name: name,
  role,
  is_active: true,
});

if (profileError) {
  console.error("Auth user created, but failed to create admin_profiles row:", profileError.message);
  process.exit(1);
}

console.log(`Admin account created: ${email} (role: ${role})`);
console.log("You can now sign in at /admin/login");
