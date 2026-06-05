import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Smile, BarChart2, Volume2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CreatePost = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeSelectedImage = () => {
    setImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) {
      setError("Please write some text or upload an image");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('content', content);
    if (image) {
      formData.append('image', image);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/posts`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create post");
      }

      // Clear form
      setContent('');
      removeSelectedImage();
      if (onPostCreated) {
        onPostCreated(data.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-post-card">
      <div className="create-post-header">
        <h2 className="create-post-title">Create Post</h2>
        <div className="create-post-tabs">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            All Posts
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            Promotions
          </button>
        </div>
      </div>

      <form onSubmit={handlePostSubmit} className="create-post-body">
        <textarea
          placeholder="What's on your mind?"
          className="create-post-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        {imagePreview && (
          <div className="image-preview-wrapper">
            <img src={imagePreview} alt="Selected preview" className="image-preview-img" />
            <button 
              type="button" 
              className="remove-preview-btn" 
              onClick={removeSelectedImage}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && <div className="create-post-error-msg">{error}</div>}

        <div className="create-post-footer">
          <div className="create-post-actions-tray">
            <button
              type="button"
              className="action-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add Image"
            >
              <ImageIcon size={20} className="action-icon img-icon-color" />
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden-file-input"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            <button type="button" className="action-icon-btn" title="Add Emoji">
              <Smile size={20} className="action-icon emoji-icon-color" />
            </button>
            
            <button type="button" className="action-icon-btn" title="Create Poll">
              <BarChart2 size={20} className="action-icon poll-icon-color" />
            </button>
            
            <button type="button" className="action-icon-btn" title="Add Voice">
              <Volume2 size={20} className="action-icon voice-icon-color" />
            </button>

            <button type="button" className="promote-action-btn">
              <Volume2 size={16} />
              <span>Promote</span>
            </button>
          </div>

          <button
            type="submit"
            className="submit-post-btn"
            disabled={isSubmitting || (!content.trim() && !image)}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
