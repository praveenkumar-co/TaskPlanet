import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const Navbar = ({ onSearchChange, searchValue, onProfileClick }) => {
  const { user, logout, theme, toggleTheme } = useAuth();

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <h1 className="navbar-logo">Social</h1>
      </div>

      <div className="navbar-middle">
        <div className="search-bar-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search promotions, users, posts..."
            className="search-input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="navbar-right">
        <button 
          onClick={toggleTheme} 
          className="navbar-icon-btn theme-toggle-btn"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="navbar-icon-btn notifications-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge">2</span>
        </button>

        {user && (
          <button 
            onClick={logout} 
            className="navbar-icon-btn logout-btn-direct"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        )}

        {user && (
          <button 
            className="avatar-trigger-btn"
            onClick={onProfileClick}
            title="My Profile"
          >
            <img src={getImageUrl(user.avatar)} alt={user.fullName} className="navbar-avatar" />
            <div className="points-badge">100</div>
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;

