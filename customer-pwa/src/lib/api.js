// src/lib/api.js
import { supabase } from './supabaseClient';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const SESSION_KEY = 'pharmalink-customer-session';

// Keep your existing apiRequest for other endpoints
export async function apiRequest(path, { token, method = 'GET', body } = {}) {
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

// Override getPharmacies and createPrescription to use Supabase directly
export const api = {
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

  // If you need to use apiRequest for other endpoints, you can still call it:
  // apiRequest: apiRequest,
};