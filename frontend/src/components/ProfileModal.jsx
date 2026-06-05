import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Heart, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, fetchCurrentUser } = useAuth();
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'followers' | 'following'

  useEffect(() => {
    if (isOpen && user) {
      const fetchUserPosts = async () => {
        setLoading(true);
        try {
          // Fetch posts created by this specific user via ownerId parameter
          const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/posts?ownerId=${user._id}&limit=100`, {
            credentials: 'include'
          });
          
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (res.ok && data.success) {
              setUserPosts(data.data.posts);
            }
          }
        } catch (err) {
          console.error("Failed to fetch user posts:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchUserPosts();
    }
  }, [isOpen, user?._id]);

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/follow/${targetUserId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchCurrentUser();
      }
    } catch (err) {
      console.error("Failed to follow/unfollow user:", err);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="profile-modal-card fade-in-entry">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Profile">
          <X size={20} />
        </button>

        <div className="profile-modal-header">
          <div className="profile-modal-cover" />
          <div className="profile-modal-avatar-container">
            <img src={getImageUrl(user.avatar)} alt={user.fullName} className="profile-modal-avatar" />
          </div>
        </div>

        <div className="profile-modal-info">
          <h2 className="profile-modal-name">{user.fullName}</h2>
          <p className="profile-modal-username">@{user.username}</p>
          
          <div className="profile-modal-stats">
            <div className="modal-stat" onClick={() => setActiveTab('posts')} style={{ cursor: 'pointer' }}>
              <span className="modal-stat-value">{userPosts.length}</span>
              <span className="modal-stat-label">Posts</span>
            </div>
            <div className="modal-stat" onClick={() => setActiveTab('followers')} style={{ cursor: 'pointer' }}>
              <span className="modal-stat-value">{user.followers?.length || 0}</span>
              <span className="modal-stat-label">Followers</span>
            </div>
            <div className="modal-stat" onClick={() => setActiveTab('following')} style={{ cursor: 'pointer' }}>
              <span className="modal-stat-value">{user.following?.length || 0}</span>
              <span className="modal-stat-label">Following</span>
            </div>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="profile-modal-tabs">
          <button 
            className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts ({userPosts.length})
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            Followers ({user.followers?.length || 0})
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Following ({user.following?.length || 0})
          </button>
        </div>

        <div className="profile-modal-posts-section">
          {activeTab === 'posts' && (
            <>
              {loading ? (
                <div className="profile-modal-loader">
                  <RefreshCw className="spinner-icon" size={20} />
                  <span>Loading my posts...</span>
                </div>
              ) : userPosts.length === 0 ? (
                <p className="no-posts-msg">You haven't posted anything yet.</p>
              ) : (
                <div className="profile-modal-posts-list">
                  {userPosts.map(post => (
                    <div key={post._id} className="profile-mini-post">
                      {post.content && <p className="mini-post-content">{post.content}</p>}
                      {post.image && (
                        <img src={getImageUrl(post.image)} alt="Post preview" className="mini-post-img" />
                      )}
                      <div className="mini-post-footer">
                        <span className="mini-post-stat">
                          <Heart size={14} />
                          {post.likes?.length || 0}
                        </span>
                        <span className="mini-post-stat">
                          <MessageSquare size={14} />
                          {post.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'followers' && (
            <div className="profile-users-list">
              {(!user.followers || user.followers.length === 0) ? (
                <p className="no-users-msg">No followers yet.</p>
              ) : (
                user.followers.map(follower => {
                  const isFollowingBack = user.following?.some(f => f._id === follower._id);
                  return (
                    <div key={follower._id} className="profile-user-item">
                      <div className="profile-user-info-group">
                        <img 
                          src={getImageUrl(follower.avatar)} 
                          alt={follower.fullName} 
                          className="profile-user-avatar" 
                        />
                        <div className="profile-user-meta">
                          <span className="profile-user-fullname">{follower.fullName}</span>
                          <span className="profile-user-username-handle">@{follower.username}</span>
                        </div>
                      </div>
                      <button 
                        className={`profile-user-action-btn ${isFollowingBack ? 'following' : ''}`}
                        onClick={() => handleFollowToggle(follower._id)}
                      >
                        {isFollowingBack ? 'Following' : 'Follow Back'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="profile-users-list">
              {(!user.following || user.following.length === 0) ? (
                <p className="no-users-msg">Not following anyone yet.</p>
              ) : (
                user.following.map(followed => (
                  <div key={followed._id} className="profile-user-item">
                    <div className="profile-user-info-group">
                      <img 
                        src={getImageUrl(followed.avatar)} 
                        alt={followed.fullName} 
                        className="profile-user-avatar" 
                      />
                      <div className="profile-user-meta">
                        <span className="profile-user-fullname">{followed.fullName}</span>
                        <span className="profile-user-username-handle">@{followed.username}</span>
                      </div>
                    </div>
                    <button 
                      className="profile-user-action-btn following"
                      onClick={() => handleFollowToggle(followed._id)}
                    >
                      Unfollow
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

