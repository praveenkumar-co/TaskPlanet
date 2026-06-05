import React, { useState, useEffect, useCallback } from 'react';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, TrendingUp, X } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const Feed = ({ searchValue }) => {
  const { user, fetchCurrentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const fetchFeed = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        filter,
        page: pageNum,
        limit: 5,
        search: searchValue
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/posts?${queryParams}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load posts");
      }

      if (isLoadMore) {
        setPosts(prev => {
          // Deduplicate based on _id
          const combined = [...prev, ...data.data.posts];
          const unique = combined.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
          return unique;
        });
      } else {
        setPosts(data.data.posts);
      }
      setTotalPages(data.data.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, searchValue]);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/suggested`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuggestedUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch suggested users:", err);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
    }
  }, [user?.following?.length, fetchSuggestedUsers]);

  const handlePostCreated = (newPost) => {
    // Instantly add the post to the top of the feed
    setPosts(prev => [newPost, ...prev]);
    // Refresh user stats (like postCount)
    fetchCurrentUser();
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchFeed(page + 1, true);
    }
  };

  const handleFollowUser = async (targetUserId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/follow/${targetUserId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh user stats (followers / following)
        await fetchCurrentUser();
        // Remove followed user from suggestions list
        setSuggestedUsers(prev => prev.filter(u => u._id !== targetUserId));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All Post' },
    { id: 'for-you', label: 'For You' },
    { id: 'most-liked', label: 'Most Liked' },
    { id: 'most-commented', label: 'Most Commented' }
  ];

  return (
    <div className="feed-layout">
      <aside className="feed-sidebar sidebar-left">
        {user && (
          <div className="user-snapshot-card">
            <div className="snapshot-cover" />
            <div className="snapshot-content">
              <img src={getImageUrl(user.avatar)} alt={user.fullName} className="snapshot-avatar" />
              <h3 className="snapshot-name">{user.fullName}</h3>
              <p className="snapshot-username">@{user.username}</p>
              
              <hr className="snapshot-divider" />
              
              <div className="snapshot-stats">
                <div className="snapshot-stat">
                  <span className="stat-value">{user.postsCount || 0}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="snapshot-stat">
                  <span className="stat-value">{user.followersCount || 0}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="snapshot-stat">
                  <span className="stat-value">100</span>
                  <span className="stat-label">Points</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="quick-links-card">
          <h4 className="quick-links-title">Promotions</h4>
          <ul className="quick-links-list">
            <li className="quick-link-item">
              <TrendingUp size={16} />
              <span>Daily Tasks (Earn Points)</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Post feed */}
      <main className="feed-main-content">
        <CreatePost onPostCreated={handlePostCreated} />

        {/* Filter Navigation */}
        <nav className="feed-filter-nav">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab-btn ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Feed Posts list */}
        <div className="feed-posts-list">
          {loading && (
            <div className="feed-loader-box">
              <RefreshCw className="spinner-icon" size={24} />
              <span>Loading posts...</span>
            </div>
          )}

          {error && !loading && (
            <div className="feed-error-box">
              <p>Error: {error}</p>
              <button onClick={() => fetchFeed(1, false)} className="retry-btn">Retry</button>
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="empty-feed-box">
              <p>No posts available. Be the first to share something!</p>
            </div>
          )}

          {/* Render suggestions section at the top if there are no posts */}
          {!loading && posts.length === 0 && suggestedUsers.length > 0 && (
            <div className="suggested-users-section fade-in-entry">
              <h4 className="suggested-users-title">Suggested for you</h4>
              <div className="suggested-users-slider">
                {suggestedUsers.map((sugUser) => (
                  <div key={sugUser._id} className="suggested-user-card">
                    <button 
                      type="button" 
                      className="suggested-user-close-btn"
                      onClick={() => setSuggestedUsers(prev => prev.filter(u => u._id !== sugUser._id))}
                      aria-label="Remove suggestion"
                    >
                      <X size={14} />
                    </button>
                    <img src={getImageUrl(sugUser.avatar)} alt={sugUser.fullName} className="suggested-user-avatar" />
                    <h5 className="suggested-user-name">{sugUser.fullName}</h5>
                    <p className="suggested-user-username">@{sugUser.username}</p>
                    <button 
                      onClick={() => handleFollowUser(sugUser._id)} 
                      className="suggested-follow-btn"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render posts with inline suggestions under the first post */}
          {posts.map((post, index) => (
            <React.Fragment key={post._id}>
              <PostCard post={post} />
              
              {index === 0 && suggestedUsers.length > 0 && (
                <div className="suggested-users-section fade-in-entry">
                  <h4 className="suggested-users-title">Suggested for you</h4>
                  <div className="suggested-users-slider">
                    {suggestedUsers.map((sugUser) => (
                      <div key={sugUser._id} className="suggested-user-card">
                        <button 
                          type="button" 
                          className="suggested-user-close-btn"
                          onClick={() => setSuggestedUsers(prev => prev.filter(u => u._id !== sugUser._id))}
                          aria-label="Remove suggestion"
                        >
                          <X size={14} />
                        </button>
                        <img src={getImageUrl(sugUser.avatar)} alt={sugUser.fullName} className="suggested-user-avatar" />
                        <h5 className="suggested-user-name">{sugUser.fullName}</h5>
                        <p className="suggested-user-username">@{sugUser.username}</p>
                        <button 
                          onClick={() => handleFollowUser(sugUser._id)} 
                          className="suggested-follow-btn"
                        >
                          Follow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Load More pagination */}
          {page < totalPages && (
            <div className="load-more-container">
              <button 
                onClick={handleLoadMore} 
                className="load-more-btn"
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="spinner-icon" size={16} />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load More Posts</span>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar (Earn points and instructions) */}
      <aside className="feed-sidebar sidebar-right">
        <div className="promo-panel-card">
          <h4 className="promo-panel-title">TaskPlanet Rewards</h4>
          <p className="promo-panel-text">
            Create posts, share your thoughts, and interact with other users' posts to earn Reward Points!
          </p>
          <div className="reward-item">
            <span className="reward-icon">💰</span>
            <div className="reward-details">
              <strong>100 Points</strong>
              <span>for each approved post</span>
            </div>
          </div>
          <div className="reward-item">
            <span className="reward-icon">🚀</span>
            <div className="reward-details">
              <strong>Up to 1000 Points</strong>
              <span>daily earning potential</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Feed;

