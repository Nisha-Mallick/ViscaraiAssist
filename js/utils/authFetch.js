import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

export async function authFetch(url, options = {}) {
  const auth = getAuth();
  
  // Wait for auth to initialize if it hasn't already
  let user = auth.currentUser;
  if (user === null) {
    user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
    });
  }
  
  const headers = new Headers(options.headers || {});
  
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (e) {
      console.error("Failed to get Firebase ID Token:", e);
    }
  }

  // Ensure content-type is set if body is JSON and not already set
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
  }

  const updatedOptions = {
    ...options,
    headers
  };

  const response = await fetch(url, updatedOptions);
  
  if (response.status === 401) {
    console.warn("authFetch received 401 Unauthorized. Token may be expired or invalid.");
    // Optionally trigger a re-auth or logout here
  }
  
  return response;
}
