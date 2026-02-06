// This component handles user registration
import React, { useState } from 'react';
import { createUser } from '../api';

function Register({ onRegisterSuccess }) {
  // Form data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Validate form data
  const validateForm = () => {
    // Name validation - at least 3 characters
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters long');
      return false;
    }

    // Email validation - must contain @ and .
    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain at least one special character (!@#$%^&* etc.)');
      return false;
    }

    return true;
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    
    setError('');

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create user in backend with normalized email
      await createUser({ 
        name: name.trim(), 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      // Show success message
      setShowSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle going to login after success
  const goToLogin = () => {
    onRegisterSuccess(null); // Switch to login page
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        {/* Show success message after registration */}
        {showSuccess ? (
          <div className="success-popup">
            <div className="success-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p>You have registered successfully!</p>
            <p>Now you can login with your credentials.</p>
            <button onClick={goToLogin} className="submit-btn">
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="auth-logo">Eventix</div>
            <h2>Create Account</h2>
            <p>Register to book events on Eventix</p>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
                <small>At least 3 characters</small>
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                />
                <small>Must be a valid email address</small>
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
                <small>Min 6 characters, 1 number, 1 special character (!@#$%^&*)</small>
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? 
              <button onClick={() => onRegisterSuccess(null)} className="link-btn">
                Login here
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
