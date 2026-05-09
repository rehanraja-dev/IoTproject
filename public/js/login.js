const form = document.getElementById('loginForm');
const messageBox = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  messageBox.textContent = 'Signing in...';

  const formData = new FormData(form);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      messageBox.textContent = result.message || 'Login failed';
      return;
    }

    messageBox.textContent = 'Login successful. Redirecting...';
    window.location.href = '/dashboard';
  } catch (error) {
    messageBox.textContent = 'Network error. Please try again.';
  }
});
