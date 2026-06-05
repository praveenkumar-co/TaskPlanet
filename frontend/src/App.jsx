import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfileModal from './components/ProfileModal';
import { RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [searchValue, setSearchValue] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-content">
          <h1 className="loading-logo">Social</h1>
          <div className="spinner-wrapper">
            <RefreshCw className="spinner-icon" size={32} />
          </div>
          <p className="loading-text">Loading TaskPlanet Social...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? (
        <>
          <Navbar 
            onSearchChange={setSearchValue} 
            searchValue={searchValue} 
            onProfileClick={() => setIsProfileOpen(true)} 
          />
          <div className="app-main-layout">
            <Feed searchValue={searchValue} />
          </div>
          <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
      ) : (
        <div className="app-auth-layout">
          <div className="auth-brand-side">
            <div className="brand-header">
              <span className="brand-logo-icon">🪐</span>
              <h1 className="brand-name">TaskPlanet</h1>
            </div>
            <h2 className="brand-tagline">Tasks, Rewards, and Community.</h2>
            <p className="brand-description">
              Connect with fellow TaskPlanet users. Share updates, showcase your achievements, and earn points on the first social page powered by rewards.
            </p>
            <div className="brand-bullets">
              <div className="bullet-item">
                <span className="bullet-icon">✅</span>
                <span>Complete daily tasks for multipliers</span>
              </div>
              <div className="bullet-item">
                <span className="bullet-icon">💬</span>
                <span>Comment and like other posts instantly</span>
              </div>
              <div className="bullet-item">
                <span className="bullet-icon">🛡️</span>
                <span>Secure access with Google Sign-In</span>
              </div>
            </div>
          </div>
          <div className="auth-form-side">
            {authView === 'login' ? (
              <Login onToggleView={() => setAuthView('signup')} />
            ) : (
              <Signup onToggleView={() => setAuthView('login')} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
