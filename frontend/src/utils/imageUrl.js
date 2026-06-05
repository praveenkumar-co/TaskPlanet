export const getImageUrl = (url) => {
  if (!url) return '';

  if (url.startsWith('/temp')) {
    return `${import.meta.env.VITE_API_URL}${url}`;
  }

  return url;
};