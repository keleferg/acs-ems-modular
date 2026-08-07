import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL =
  'https://oegbgelcjzkvowymckqg.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_mH4D6uGXxfsU2wKYCCjLzA_C8lWcabM';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export async function getCurrentEmtUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function signInEmtExaminer(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOutEmtExaminer() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function loadEmtAppointments() {
  const { data, error } = await supabase.rpc(
    'examiner_get_emt_appointments'
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
