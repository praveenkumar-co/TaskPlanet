export const getImageUrl = (url) => {
  if (!url) return '';

  if (url.startsWith('/temp')) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}${url}`;
  }

  return url;
};