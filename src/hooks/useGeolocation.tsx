
import { useState, useEffect } from 'react';

interface GeolocationState {
  loading: boolean;
  error: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
    city?: string | null;
    country?: string | null;
  };
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    location: {
      latitude: null,
      longitude: null,
      city: null,
      country: null,
    },
  });

  const getLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
      );
      const data = await response.json();
      
      return {
        city: data.address?.city || data.address?.town || data.address?.village || null,
        country: data.address?.country || null,
      };
    } catch (error) {
      console.error('Error getting location name:', error);
      return { city: null, country: null };
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        const locationName = await getLocationName(latitude, longitude);
        
        setState({
          loading: false,
          error: null,
          location: {
            latitude,
            longitude,
            ...locationName,
          },
        });
      },
      error => {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    );
  }, []);

  return state;
}
