import { useState } from 'react';

export const useForm = (initialState) => {
  const [formData, setFormData] = useState(initialState);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialState);
  };

  const setFormValues = (values) => {
    setFormData(values);
  };

  return {
    formData,
    handleInputChange,
    resetForm,
    setFormValues
  };
};