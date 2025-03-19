import React, { useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapPin, Loader2 } from 'lucide-react';

interface ProduceFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

interface FormData {
  produceName: string;
  sourceLocation: string;
  userLocation: {
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

const ProduceForm: React.FC<ProduceFormProps> = ({ onSubmit, isLoading }) => {
  const [produceName, setProduceName] = useState('');
  const [sourceLocation, setSourceLocation] = useState('');
  const { loading: locationLoading, error: locationError, location } = useGeolocation();
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualCountry, setManualCountry] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produceName || !sourceLocation) return;
    
    const userLocation = isManualLocation
      ? { 
          city: manualCity || null, 
          country: manualCountry || null, 
          latitude: null, 
          longitude: null 
        }
      : {
          city: location.city || null,
          country: location.country || null,
          latitude: location.latitude,
          longitude: location.longitude
        };
    
    onSubmit({
      produceName,
      sourceLocation,
      userLocation
    });
  };

  return (
    <div className="glass-panel p-6 transition-all duration-300 w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="produceName" className="text-sm font-medium text-gray-700">
            Produce Name
          </label>
          <input
            id="produceName"
            type="text"
            value={produceName}
            onChange={(e) => setProduceName(e.target.value)}
            placeholder="e.g. Avocado, Strawberry, Tomato"
            className="subtle-input w-full"
            required
          />
        </div>
        
        <div className="space-y-1.5">
          <label htmlFor="sourceLocation" className="text-sm font-medium text-gray-700">
            Source Location (from label)
          </label>
          <input
            id="sourceLocation"
            type="text"
            value={sourceLocation}
            onChange={(e) => setSourceLocation(e.target.value)}
            placeholder="e.g. Mexico, Spain, California"
            className="subtle-input w-full"
            required
          />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Your Location
            </label>
            <button
              type="button"
              onClick={() => setIsManualLocation(!isManualLocation)}
              className="text-xs text-sage-600 hover:text-sage-800 transition-colors"
            >
              {isManualLocation ? "Use automatic location" : "Enter manually"}
            </button>
          </div>
          
          {isManualLocation ? (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="City"
                className="subtle-input w-full"
              />
              <input
                type="text"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="Country"
                className="subtle-input w-full"
              />
            </div>
          ) : (
            <div className="subtle-input w-full flex items-center space-x-2 px-4 py-3">
              {locationLoading ? (
                <div className="flex items-center text-gray-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Detecting your location...</span>
                </div>
              ) : locationError ? (
                <div className="text-red-500 text-sm">
                  {locationError}. Please enter your location manually.
                </div>
              ) : (
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2 text-sage-500" />
                  <span>
                    {location.city ? `${location.city}, ` : ''}
                    {location.country || 'Location detected'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || (!isManualLocation && locationLoading)}
          className="w-full bg-sage-600 hover:bg-sage-700 text-white py-3 px-4 rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Sustainability'
          )}
        </button>
      </form>
    </div>
  );
};

export default ProduceForm;
