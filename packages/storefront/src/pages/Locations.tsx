import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  isActive: boolean;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
}

export default function Locations() {
  const { data: locations, error, isLoading } = useApi<Location[]>('/api/locations');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Our Locations</h1>
        <p className="mt-2 text-gray-600">Find a KitchenAsty near you and start ordering.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Failed to load locations. Please try again later.
        </div>
      )}

      {locations && locations.length === 0 && (
        <p className="text-gray-500 text-center py-12">No locations available yet.</p>
      )}

      {locations && locations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.filter((l) => l.isActive).map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <svg className="w-16 h-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{loc.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{loc.address}</p>
                <p className="text-sm text-gray-600 mb-3">
                  {loc.city}, {loc.state} {loc.zip}
                </p>
                {loc.phone && (
                  <p className="text-sm text-gray-500 mb-4">{loc.phone}</p>
                )}
                <div className="flex gap-2 mb-4">
                  {loc.acceptsDelivery && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Delivery
                    </span>
                  )}
                  {loc.acceptsPickup && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Pickup
                    </span>
                  )}
                </div>
                <Link
                  to={`/menu?location=${loc.id}`}
                  className="block text-center bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Order Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
