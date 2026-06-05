import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const Login = ({ onToggleView }) => {
  const { login, googleLogin } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password.trim()) {
      setLocalError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await login(emailOrUsername, password);
    } catch (err) {
      setLocalError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setLocalError(null);
    try {
      await googleLogin(credentialResponse.credential);
    } catch (err) {
      setLocalError(err.message || "Google Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    setLocalError("Google sign-in was unsuccessful. Try again later.");
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Log in to TaskPlanet Social Feed</p>
        </div>

        {localError && (
          <div className="auth-error-box">
            <AlertCircle size={18} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="emailOrUsername">Email or Username</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="emailOrUsername"
                type="text"
                className="form-input"
                placeholder="Enter email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="auth-divider">
          <span className="divider-text">OR</span>
        </div>

        <div className="google-auth-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
            theme="filled_blue"
            text="signin_with"
            shape="rectangular"
            width="100%"
          />
        </div>

        <p className="auth-switch-text">
          Don't have an account?{' '}
          <button onClick={onToggleView} className="auth-switch-btn" disabled={loading}>
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
