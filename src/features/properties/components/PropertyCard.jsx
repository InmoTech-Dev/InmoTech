import React from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Building2, Home, Key, MapPin, ArrowRight } from "lucide-react"

export function PropertyCard({ property }) {
  return (
    <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 group rounded-xl">
      <div className="relative h-72">
        <img
          src={property.image || "/placeholder.svg?height=256&width=384"}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge className="absolute top-4 right-4 bg-[#00457B] px-3 py-1 text-sm font-medium">
          {property.status}
        </Badge>
        {property.featured && (
          <Badge className="absolute top-4 left-4 bg-amber-500 px-3 py-1 text-sm font-medium">
            Destacado
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-20"></div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl group-hover:text-[#00457B] transition-colors duration-300">
            {property.title}
          </CardTitle>
          <p className="text-xl font-bold text-[#00457B] bg-blue-50 px-3 py-1 rounded-full">
            {property.price}
          </p>
        </div>
        <div className="flex items-center text-gray-500 text-sm mt-1">
          <MapPin className="h-4 w-4 mr-1 text-[#00457B]" /> {property.location}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center">
            <Home className="h-4 w-4 mr-1 text-[#00457B]" /> {property.area}
          </div>
          <div className="flex items-center">
            <Building2 className="h-4 w-4 mr-1 text-[#00457B]" /> {property.bedrooms} Hab.
          </div>
          <div className="flex items-center">
            <Key className="h-4 w-4 mr-1 text-[#00457B]" /> {property.bathrooms} Baños
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className="w-full bg-[#00457B] hover:bg-[#003b69] rounded-full group-hover:shadow-lg transition-all duration-300"
        >
          <Link to={`/inmuebles/${property.id}`} className="flex items-center justify-center gap-2">
            Ver detalles
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}