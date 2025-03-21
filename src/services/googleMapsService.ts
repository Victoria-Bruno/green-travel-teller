import { toast } from "@/components/ui/use-toast";

// Cache for country capitals to reduce API calls
const capitalCache: Record<string, { lat: number; lng: number }> = {
  "spain": { lat: 40.4168, lng: -3.7038 }, // Madrid
  "france": { lat: 48.8566, lng: 2.3522 }, // Paris
  "italy": { lat: 41.9028, lng: 12.4964 }, // Rome
  "germany": { lat: 52.5200, lng: 13.4050 }, // Berlin
  "united kingdom": { lat: 51.5074, lng: -0.1278 }, // London
  "netherlands": { lat: 52.3676, lng: 4.9041 }, // Amsterdam
  "belgium": { lat: 50.8503, lng: 4.3517 }, // Brussels
  "portugal": { lat: 38.7223, lng: -9.1393 }, // Lisbon
  "greece": { lat: 37.9838, lng: 23.7275 }, // Athens
  "sweden": { lat: 59.3293, lng: 18.0686 }, // Stockholm
  "norway": { lat: 59.9139, lng: 10.7522 }, // Oslo
  "denmark": { lat: 55.6761, lng: 12.5683 }, // Copenhagen
  "finland": { lat: 60.1699, lng: 24.9384 }, // Helsinki
  "poland": { lat: 52.2297, lng: 21.0122 }, // Warsaw
  "austria": { lat: 48.2082, lng: 16.3738 }, // Vienna
  "switzerland": { lat: 46.9480, lng: 7.4474 }, // Bern
  "ireland": { lat: 53.3498, lng: -6.2603 }, // Dublin
  "mexico": { lat: 19.4326, lng: -99.1332 }, // Mexico City
  "usa": { lat: 38.9072, lng: -77.0369 }, // Washington DC
  "canada": { lat: 45.4215, lng: -75.6972 }, // Ottawa
  "brazil": { lat: -15.7801, lng: -47.9292 }, // Brasília
  "argentina": { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  "chile": { lat: -33.4489, lng: -70.6693 }, // Santiago
  "morocco": { lat: 34.0209, lng: -6.8416 }, // Rabat
  "south africa": { lat: -25.7461, lng: 28.1881 }, // Pretoria
  "egypt": { lat: 30.0444, lng: 31.2357 }, // Cairo
  "china": { lat: 39.9042, lng: 116.4074 }, // Beijing
  "japan": { lat: 35.6762, lng: 139.6503 }, // Tokyo
  "india": { lat: 28.6139, lng: 77.2090 }, // New Delhi
  "australia": { lat: -35.2809, lng: 149.1300 }, // Canberra
  "new zealand": { lat: -41.2865, lng: 174.7762 } // Wellington
};

// Initialize Google Maps API
let googleMapsInitialized = false;
let distanceMatrixService: google.maps.DistanceMatrixService | null = null;
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const initGoogleMaps = (): Promise<void> => {
  if (googleMapsInitialized && distanceMatrixService) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Add Google Maps script if not already loaded
    if (!document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        googleMapsInitialized = true;
        distanceMatrixService = new google.maps.DistanceMatrixService();
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps:', error);
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    } else {
      googleMapsInitialized = true;
      distanceMatrixService = new google.maps.DistanceMatrixService();
      resolve();
    }
  });
};

const getCountryCoordinates = async (countryName: string): Promise<{ lat: number; lng: number }> => {
  const normalizedCountry = countryName.toLowerCase().trim();
  
  // Check cache first
  for (const [key, coords] of Object.entries(capitalCache)) {
    if (normalizedCountry.includes(key) || key.includes(normalizedCountry)) {
      return coords;
    }
  }
  
  // For countries not in cache, use geocoding
  await initGoogleMaps();
  
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address: countryName }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        console.error('Geocoding error:', status);
        // Default to a central location if geocoding fails
        resolve({ lat: 0, lng: 0 });
      }
    });
  });
};

export const calculateDistance = async (
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string
): Promise<number> => {
  try {
    await initGoogleMaps();
    
    if (!googleMapsInitialized) {
      throw new Error('Google Maps not initialized');
    }
    
    // Convert string locations to coordinates if needed
    const originCoords = typeof origin === 'string' 
      ? await getCountryCoordinates(origin)
      : origin;
      
    const destinationCoords = typeof destination === 'string'
      ? await getCountryCoordinates(destination)
      : destination;
    
    // Calculate using geometry library for direct distance
    const originLatLng = new google.maps.LatLng(originCoords.lat, originCoords.lng);
    const destinationLatLng = new google.maps.LatLng(destinationCoords.lat, destinationCoords.lng);
    
    // Use spherical geometry to calculate distance (as the crow flies)
    const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
      originLatLng,
      destinationLatLng
    );
    
    // Convert to kilometers and round
    return Math.round(distanceInMeters / 1000);
  } catch (error) {
    console.error('Error calculating distance:', error);
    toast({
      title: "Distance Calculation Error",
      description: "Falling back to approximate distance calculation",
      variant: "destructive",
    });
    
    // Fallback to calculating distance using the Haversine formula
    if (typeof origin !== 'string' && typeof destination !== 'string') {
      return calculateHaversineDistance(origin, destination);
    }
    
    // If we still have strings, use a reasonable default
    return 5000;
  }
};

const calculateHaversineDistance = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = degreesToRadians(destination.lat - origin.lat);
  const dLng = degreesToRadians(destination.lng - origin.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(degreesToRadians(origin.lat)) * Math.cos(degreesToRadians(destination.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
};

const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI/180);
};

export const getUserLocationCoordinates = async (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          console.error('Geolocation error:', error);
          reject(new Error('Unable to determine your location. Please enter your location manually.'));
        }
      );
    } else {
      console.error('Geolocation not supported');
      reject(new Error('Geolocation is not supported by your browser. Please enter your location manually.'));
    }
  });
};
