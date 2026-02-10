// services/buyerService.js
import api from '../config/axios';

export const buyersService = {
  // Obtener todos los compradores
  async getAllBuyers(search = '') {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/buyers', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener compradores');
    }
  },

  // Crear comprador (solo datos básicos)
  async createBuyer(buyerData) {
    try {
      const response = await api.post('/buyers', buyerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear comprador');
    }
  },

  // Asignar datos de compra
  async assignPurchase(buyerId, purchaseData) {
    try {
      const response = await api.put(`/buyers/${buyerId}/asignar-compra`, purchaseData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al asignar datos de compra');
    }
  },

  // Obtener comprador por ID
  async getBuyerById(id) {
    try {
      const response = await api.get(`/buyers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener comprador');
    }
  },

  // Actualizar comprador
  async updateBuyer(id, buyerData) {
    try {
      const response = await api.put(`/buyers/${id}`, buyerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar comprador');
    }
  },

  // Eliminar comprador
  async deleteBuyer(id) {
    try {
      const response = await api.delete(`/buyers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar comprador');
    }
  },

  // Obtener compradores potenciales
  async getPotentialBuyers() {
    try {
      const response = await api.get('/buyers/potenciales');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener compradores potenciales');
    }
  },

  // Buscar compradores
  async searchBuyers(searchTerm) {
    try {
      const response = await api.get(`/buyers?search=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al buscar compradores');
    }
  }
};