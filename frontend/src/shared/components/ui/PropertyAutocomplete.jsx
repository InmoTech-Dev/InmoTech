import React, { useState, useRef, useEffect } from 'react';
import { Search, Building, MapPin, User, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';

const PropertyAutocomplete = ({ 
  value, 
  onChange, 
  onPropertySelect, 
  placeholder = "Buscar por referencia...",
  className = "",
  error = false,
  filteredProperties = [],
  isSearching = false,
  onSearchChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    onSearchChange?.(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Seleccionar propiedad
  const handlePropertySelect = (property) => {
    onChange(property.reference);
    onPropertySelect(property);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (!isOpen || filteredProperties.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProperties.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProperties.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handlePropertySelect(filteredProperties[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll al elemento destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${error ? 'border-red-500' : ''}`}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            onClick={() => {
              onChange('');
              onSearchChange?.('');
              setIsOpen(false);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (value.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-3 text-center text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Buscando...
            </div>
          ) : filteredProperties.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredProperties.map((property, index) => (
                <li
                  key={property.id}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex 
                      ? 'bg-blue-50 border-l-2 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handlePropertySelect(property)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Building className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {property.reference}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {property.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-1">
                        {property.title}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{property.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{property.owner}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-center text-gray-500">
              <Building className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No se encontraron inmuebles</p>
              <p className="text-xs text-gray-400">
                Intenta con otra referencia o título
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyAutocomplete;