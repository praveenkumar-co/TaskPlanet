import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

const PostCard = ({ post }) => {
  const { user, fetchCurrentUser } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [commentContent, setCommentContent] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const isLikedByCurrentUser = user ? likes.some(likeUser => likeUser._id === user._id) : false;
  const isOwner = user && post.owner?._id === user._id;
  const isFollowing = user && user.following?.some(id => (id._id || id).toString() === post.owner?._id);

  const handleLikeToggle = async () => {
    if (!user) return;
    if (isLiking) return;

    setIsLiking(true);

    // Optimistic UI update
    const previousLikes = [...likes];
    let updatedLikes = [];
    if (isLikedByCurrentUser) {
      updatedLikes = likes.filter(likeUser => likeUser._id !== user._id);
    } else {
      updatedLikes = [...likes, { _id: user._id, username: user.username, fullName: user.fullName, avatar: user.avatar }];
    }
    setLikes(updatedLikes);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/posts/like/${post._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update like");
      }

      // Update state with actual backend response
      setLikes(data.data.likes);
    } catch (err) {
      console.error(err);
      // Revert on error
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollowClick = async () => {
    if (!user || isOwner) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/follow/${post.owner?._id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh global user state to update following list & counts
        await fetchCurrentUser();
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user || !commentContent.trim() || isCommenting) return;

    setIsCommenting(true);
    const text = commentContent;
    setCommentContent('');

    // Optimistic UI update
    const tempComment = {
      _id: Date.now().toString(),
      content: text,
      owner: user._id,
      username: user.username,
      avatar: user.avatar,
      createdAt: new Date().toISOString()
    };
    const previousComments = [...comments];
    setComments([...comments, tempComment]);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/posts/comment/${post._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add comment");
      }

      // Update state with actual backend response
      setComments(data.data.comments);
    } catch (err) {
      console.error(err);
      // Revert on error
      setComments(previousComments);
    } finally {
      setIsCommenting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/,/g, '');
  };

  // Check if this post is a promo card to add special TaskPlanet style
  const isPromo = post.content && (post.content.toLowerCase().includes('points') || post.content?.toLowerCase().includes('earn'));

  return (
    <article className={`post-card ${isPromo ? 'promo-post' : ''}`}>
      {isPromo && <div className="pinned-badge">📌 Pinned</div>}

      <div className="post-header">
        <div className="post-author-info">
          <img src={getImageUrl(post.owner?.avatar)} alt={post.owner?.fullName} className="post-avatar" />
          <div>
            <div className="post-author-names">
              <span className="post-author-name">{post.owner?.fullName}</span>
              <span className="post-author-username">@{post.owner?.username}</span>
            </div>
            <span className="post-date">{formatDate(post.createdAt)}</span>
          </div>
        </div>

        {!isOwner && user && (
          <button
            className={`follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollowClick}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      <div className="post-body">
        {post.content && <p className="post-text-content">{post.content}</p>}
        {post.image && (
          <div className="post-image-container">
            <img src={getImageUrl(post.image)} alt="Post media" className="post-image" loading="lazy" />
          </div>
        )}
      </div>

      {isPromo && (
        <div className="promo-badge-container">
          <span className="promo-action-badge">Post & Earn</span>
        </div>
      )}

      {/* Liked By List */}
      {likes.length > 0 && (
        <div className="post-liked-by">
          Liked by {likes.map(u => u.username ? `@${u.username}` : 'User').join(', ')}
        </div>
      )}

      <div className="post-footer">
        <div className="post-stats">
          <button
            className={`stat-btn like-btn ${isLikedByCurrentUser ? 'active' : ''}`}
            onClick={handleLikeToggle}
            title={likes.map(u => `@${u.username}`).join(', ') || 'Like this post'}
          >
            <Heart size={20} className={isLikedByCurrentUser ? 'fill-heart' : ''} />
            <span>{likes.length}</span>
          </button>

          <button
            className={`stat-btn comment-btn ${showComments ? 'active' : ''}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={20} />
            <span>{comments.length}</span>
          </button>
        </div>

        <button className="stat-btn share-btn" aria-label="Share">
          <Share2 size={20} />
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <hr className="comments-divider" />

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments-msg">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <img src={getImageUrl(comment.avatar)} alt={comment.username} className="comment-avatar" />
                  <div className="comment-bubble">
                    <div className="comment-bubble-header">
                      <span className="comment-username">@{comment.username}</span>
                      <span className="comment-time">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <input
                type="text"
                placeholder="Write a comment..."
                className="comment-input"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
              />
              <button
                type="submit"
                className="comment-submit-btn"
                disabled={!commentContent.trim() || isCommenting}
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};

export default PostCard;

