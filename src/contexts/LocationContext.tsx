import { createContext, useContext, useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Location } from '../types';
import toast from 'react-hot-toast';

interface LocationContextType {
  currentLocation: Location | null;
  setCurrentLocation: (location: Location) => void;
  loading: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | null>(null);

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocation() {
      try {
        // Request permissions first
        const permissionStatus = await Geolocation.checkPermissions();
        if (permissionStatus.location !== 'granted') {
          const permission = await Geolocation.requestPermissions();
          if (permission.location !== 'granted') {
            throw new Error('Location permission denied');
          }
        }

        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5000,
        });

        // Reverse geocode using Google Maps API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=AIzaSyDPlj-KWC4RVsBk-wGSDJHZ4ndv7Kfs15o`
        );

        const data = await response.json();
        
        if (data.results[0]) {
          setCurrentLocation({
            address: data.results[0].formatted_address,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }
      } catch (err) {
        console.error('Error getting location:', err);
        setError('Failed to get your location');
        toast.error('Failed to get your location. Please set it manually.');
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ currentLocation, setCurrentLocation, loading, error }}>
      {children}
    </LocationContext.Provider>
  );
}