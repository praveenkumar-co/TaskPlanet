import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { User, Mail, Lock, Image as ImageIcon, AlertCircle, X } from 'lucide-react';

const Signup = ({ onToggleView }) => {
  const { register, googleLogin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setLocalError("Avatar size should be less than 2MB");
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      setLocalError(null);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setLocalError("All fields are required");
      return;
    }

    if (!avatar) {
      setLocalError("Please upload an avatar image");
      return;
    }

    const cleanedUsername = username.trim().toLowerCase();
    if (/[^a-zA-Z0-9_]/.test(cleanedUsername)) {
      setLocalError("Username can only contain alphanumeric characters and underscores");
      return;
    }

    setLoading(true);
    setLocalError(null);

    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    formData.append('username', cleanedUsername);
    formData.append('email', email.trim().toLowerCase());
    formData.append('password', password);
    formData.append('avatar', avatar);

    try {
      await register(formData);
      // Automatically log in after registration
      const loginRes = await fetch('/api/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email, password })
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        // Reload app or context will capture cookies
        window.location.reload();
      } else {
        onToggleView(); // Go to login page
      }
    } catch (err) {
      setLocalError(err.message || "Failed to create account");
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
    setLocalError("Google sign-up was unsuccessful. Try again later.");
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join the TaskPlanet Social Community</p>
        </div>

        {localError && (
          <div className="auth-error-box">
            <AlertCircle size={18} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                id="fullName"
                type="text"
                className="form-input"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter username (alphanumeric)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Profile Avatar</label>
            <div className="avatar-uploader">
              {avatarPreview ? (
                <div className="avatar-preview-box">
                  <img src={avatarPreview} alt="Avatar preview" className="avatar-preview-img" />
                  <button 
                    type="button" 
                    className="avatar-remove-btn" 
                    onClick={handleRemoveAvatar}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="avatar-upload-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <ImageIcon size={24} />
                  <span>Choose Avatar Image</span>
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden-file-input"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
          >
            {loading ? "Registering..." : "Sign Up"}
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
            text="signup_with"
            shape="rectangular"
            width="100%"
          />
        </div>

        <p className="auth-switch-text">
          Already have an account?{' '}
          <button onClick={onToggleView} className="auth-switch-btn" disabled={loading}>
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
