import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Search, Filter, MapPin, Home, DollarSign } from "lucide-react"

export function PropertyFilters({ filters, onFiltersChange, onSearch }) {
  const [openDropdownId, setOpenDropdownId] = useState(null)

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleOpenChange = (id, isOpen) => {
    setOpenDropdownId(isOpen ? id : null)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center">
            <Home className="h-4 w-4 mr-2 text-[#00457B]" />
            Tipo de propiedad
          </label>
          <Select
            id="type"
            value={filters.type}
            onValueChange={(value) => handleFilterChange('type', value)}
            isOpen={openDropdownId === "type"}
            onOpenChange={(isOpen) => handleOpenChange("type", isOpen)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="apartamento">Apartamento</SelectItem>
              <SelectItem value="oficina">Oficina</SelectItem>
              <SelectItem value="terreno">Terreno</SelectItem>
              <SelectItem value="local-comercial">Local Comercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-[#00457B]" />
            Ubicación
          </label>
          <Select
            id="location"
            value={filters.location}
            onValueChange={(value) => handleFilterChange('location', value)}
            isOpen={openDropdownId === "location"}
            onOpenChange={(isOpen) => handleOpenChange("location", isOpen)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las ubicaciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              <SelectItem value="poblado">El Poblado</SelectItem>
              <SelectItem value="laureles">Laureles</SelectItem>
              <SelectItem value="envigado">Envigado</SelectItem>
              <SelectItem value="belen">Belén</SelectItem>
              <SelectItem value="sabaneta">Sabaneta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-[#00457B]" />
            Precio máximo
          </label>
          <Select
            id="maxPrice"
            value={filters.maxPrice}
            onValueChange={(value) => handleFilterChange('maxPrice', value)}
            isOpen={openDropdownId === "maxPrice"}
            onOpenChange={(isOpen) => handleOpenChange("maxPrice", isOpen)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin límite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sin límite</SelectItem>
              <SelectItem value="200000">$200,000</SelectItem>
              <SelectItem value="500000">$500,000</SelectItem>
              <SelectItem value="1000000">$1,000,000</SelectItem>
              <SelectItem value="2000000">$2,000,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Buscar por palabra clave
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              className="pl-10"
              value={filters.search || ""}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={onSearch} 
            className="bg-[#00457B] hover:bg-[#003b69] flex-1"
          >
            <Search className="h-4 w-4 mr-2" /> Buscar
          </Button>
          <Button variant="ghost" size="icon" className="text-[#00457B]">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
