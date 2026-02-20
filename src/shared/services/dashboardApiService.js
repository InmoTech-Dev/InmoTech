import { apiClient } from './api.config';

class DashboardApiService {
  constructor() {
    this.overviewInFlight = new Map();
  }

  async getDashboardOverview({ range } = {}) {
    const overviewKey = range || 'default';
    if (this.overviewInFlight.has(overviewKey)) {
      return this.overviewInFlight.get(overviewKey);
    }

    const requestPromise = (async () => {
      try {
        const params = {};
        if (range) {
          params.range = range;
        }

        const response = await apiClient.get('/dashboard/overview', params);

        if (!response?.success) {
          throw new Error(response?.message || 'Error obteniendo overview del dashboard');
        }

        return response.data;
      } catch (error) {
        console.error('Error en getDashboardOverview:', error);
        throw error;
      } finally {
        this.overviewInFlight.delete(overviewKey);
      }
    })();

    this.overviewInFlight.set(overviewKey, requestPromise);
    return requestPromise;
  }

  async getDashboardStats(params = {}) {
    return this.getDashboardOverview(params);
  }
}

export default new DashboardApiService();
