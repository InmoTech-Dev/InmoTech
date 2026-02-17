import { useState } from 'react';

export const useModal = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedOwner, setSelectedOwner] = useState(null);

  const openModal = (mode, owner = null) => {
    setModalMode(mode);
    setSelectedOwner(owner);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedOwner(null);
  };

  return {
    modalOpen,
    modalMode,
    selectedOwner,
    openModal,
    closeModal
  };
};  