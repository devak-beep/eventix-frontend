// This component handles user login
import React, { useState } from 'react';
import { loginUser } from '../api';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      // Login with normalized email
      const response = await loginUser({ 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      // Save user info in localStorage (browser storage)
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Tell parent component login was successful
      onLoginSuccess(user);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">Eventix</div>
        <h2>Welcome Back!</h2>
        <p>Login to book events on Eventix</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? 
          <button onClick={onSwitchToRegister} className="link-btn">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
