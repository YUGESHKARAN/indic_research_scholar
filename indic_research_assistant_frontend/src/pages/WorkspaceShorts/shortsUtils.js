import api from '../../instances/axiosInstance';

export const API_BASE_URL = api.defaults.baseURL || window.location.origin;

export function apiUrl(relativeUrl) {
  return new URL(relativeUrl, API_BASE_URL).toString();
}

export function displayDuration(duration = 0) {
  const totalSeconds = Math.max(0, Math.round(duration));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function getErrorMessage(error, fallback) {
  return error.response?.data?.error || fallback;
}
