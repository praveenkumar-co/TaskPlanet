export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/temp')) {
    // Return direct backend URL to bypass proxy issues in certain environments
    return `http://localhost:8000${url}`;
  }
  return url;
};
