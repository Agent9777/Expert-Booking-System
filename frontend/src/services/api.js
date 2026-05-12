import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error. Please check your connection.');
    return Promise.reject({ ...error, displayMessage: message });
  }
);

export const expertService = {
  getExperts: (params) => api.get('/experts', { params }),
  getExpertById: (id) => api.get(`/experts/${id}`),
};

export const bookingService = {
  createBooking: (data) => api.post('/bookings', data),
  getBookingsByEmail: (email) => api.get('/bookings', { params: { email } }),
  updateBookingStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
};

export const reservationService = {
  lockSlot: (data) => api.post('/reservations/lock', data),
  releaseSlot: (data) => api.delete('/reservations/release', { data }),
  getReservations: (expertId) => api.get(`/reservations/${expertId}`),
};

export default api;
