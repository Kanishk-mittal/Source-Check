const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function registerUser(username, email) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to register user');
  }
  return res.json();
}

export async function loginUser(username, privateKeyPem) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username.trim(),
      private_key_pem: privateKeyPem.trim()
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed. Please check username and private key.');
  }
  return res.json();
}

export async function listUsers() {
  const res = await fetch(`${API_BASE}/auth/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function registerImage(formData) {
  const res = await fetch(`${API_BASE}/registry/register-image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Image registration failed');
  }
  return res.json();
}

export async function listImages() {
  const res = await fetch(`${API_BASE}/registry/images`);
  if (!res.ok) throw new Error('Failed to fetch registered images');
  return res.json();
}

export async function getImageDetails(imageId) {
  const res = await fetch(`${API_BASE}/registry/images/${imageId}`);
  if (!res.ok) throw new Error('Failed to fetch image details');
  return res.json();
}

export function getImageFileUrl(imageId) {
  return `${API_BASE}/registry/images/${imageId}/file`;
}

export async function verifyImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/verification/verify-image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Verification failed');
  }
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/verification/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
