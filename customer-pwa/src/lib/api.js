// src/lib/api.js
import { supabase } from './supabaseClient';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const SESSION_KEY = 'pharmalink-customer-session';

// Keep your existing apiRequest for other endpoints
export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  // ... (Keep your existing apiRequest code exactly as it is)
  let accessToken = token;
  if (!accessToken) {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        accessToken = session?.accessToken;
      }
    } catch (error) {
      console.error('Unable to read customer session:', error);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'The request could not be completed');
  }
  return payload;
}

// Override getPharmacies, createPrescription, and AUTH methods to use Supabase directly
export const api = {
  // Existing methods
  getPharmacies: async () => {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('id, name, address');
    if (error) {
      console.error('Supabase getPharmacies error:', error);
      throw new Error(error.message);
    }
    return data || [];
  },

  createPrescription: async (prescriptionData) => {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([prescriptionData])
      .select()
      .single();
    if (error) {
      console.error('Supabase createPrescription error:', error);
      throw new Error(error.message);
    }
    return data;
  },

  // NEW: AUTH METHODS
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  register: async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
        }
      }
    });
    if (error) throw error;
    return data;
  },

  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // User will be redirected here after clicking the email link
    });
    if (error) throw error;
    return data;
  },
};