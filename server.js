// Function to handle Sign Up
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        name: signupForm.querySelector('input[type="text"]').value,
        email: signupForm.querySelector('input[type="email"]').value,
        password: signupForm.querySelector('input[type="password"]').value,
    };

    const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });

    const result = await response.json();
    alert(result.message);
});

// Function to handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        email: loginForm.querySelector('input[type="email"]').value,
        password: loginForm.querySelector('input[type="password"]').value,
    };

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });

    const result = await response.json();
    if (response.ok) {
        localStorage.setItem('token', result.token); // Save token for future use
        alert(result.message);
    } else {
        alert(result.message);
    }
});
