const form = document.getElementById('registerForm');
const messageBox = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  messageBox.textContent = 'Creating account...';

  const formData = new FormData(form);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      messageBox.textContent = result.message || 'Registration failed';
      return;
    }

    messageBox.textContent = 'Registration successful. Redirecting...';
    window.location.href = '/dashboard';
  } catch (error) {
    messageBox.textContent = 'Network error. Please try again.';
  }
});
