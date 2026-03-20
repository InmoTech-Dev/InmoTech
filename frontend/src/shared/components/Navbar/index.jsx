import React, { useRef, useEffect } from 'react';
import { useMobileMenu } from '../../hooks/useMobileMenu';
import Logo from './Logo';
import Navigation from './Navigation';
import ActionButtons from './ActionButtons';
import MobileMenu from './MobileMenu';
import MobileMenuButton from './MobileMenuButton';

/**
 * Main Navbar component with modular architecture
 * Composes smaller components for better maintainability
 */
const Navbar = () => {
  const mobileMenu = useMobileMenu();
  const navbarRef = useRef(null);

  const handleMobileMenuClose = () => {
    mobileMenu.close();
  };

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target) && mobileMenu.isOpen) {
        mobileMenu.close();
      }
    };

    if (mobileMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenu.isOpen, mobileMenu.close]);

  return (
    <nav ref={navbarRef} className="bg-[#00457B] px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
        {/* Logo Section */}
        <Logo />

        {/* Desktop Navigation */}
        <Navigation />

        {/* Desktop Action Buttons */}
        <ActionButtons />

        {/* Mobile Menu Button */}
        <MobileMenuButton
          isOpen={mobileMenu.isOpen}
          onClick={mobileMenu.toggle}
        />
      </div>

      {/* Mobile Menu with Enhanced Animation */}
      <div className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
        mobileMenu.isOpen
          ? 'max-h-screen opacity-100 transform translate-y-0'
          : 'max-h-0 opacity-0 transform -translate-y-4'
      }`}>
        <MobileMenu
          isOpen={mobileMenu.isOpen}
          onClose={handleMobileMenuClose}
        />
      </div>
    </nav>
  );
};

export default Navbar;
