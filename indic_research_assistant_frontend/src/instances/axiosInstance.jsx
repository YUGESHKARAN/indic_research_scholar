import axios from 'axios'

const NODE_BASE_URL = import.meta.env.VITE_NODE_BASE_URL || 'http://localhost:3000'
// const NODE_BASE_URL ='http://localhost:3000'

const api = axios.create({
  baseURL: NODE_BASE_URL,
  withCredentials: true, // sends/receives the httpOnly JWT cookie set by Node
})

let unauthorizedHandler = null
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn
}

// Register the interceptor as a side effect — don't assign its return value anywhere
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck =
      error.config?.url?.includes("/api/scholar/me");

    if (error.response?.status === 401 && isAuthCheck && unauthorizedHandler) {
      unauthorizedHandler();
    }

    return Promise.reject(error);
  }
);

export default api