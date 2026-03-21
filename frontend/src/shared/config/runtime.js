const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const requireEnvValue = (name) => {
  const value = import.meta.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
};

export const getApiBaseUrl = () => normalizeUrl(requireEnvValue('VITE_API_URL'));
