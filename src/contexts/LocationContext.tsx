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
    let isMounted = true;

    async function requestAndFetchLocation() {
      try {
        // First, request permissions explicitly
        const permissionStatus = await Geolocation.checkPermissions();
        
        if (permissionStatus.location === 'prompt' || permissionStatus.location === 'prompt-with-rationale') {
          // Show a toast to inform the user about the upcoming permission request
          toast.loading('Requesting location access...', { duration: 2000 });
          
          const permission = await Geolocation.requestPermissions();
          if (!isMounted) return;

          if (permission.location !== 'granted') {
            throw new Error('Location permission denied');
          }
        } else if (permissionStatus.location !== 'granted') {
          throw new Error('Location permission denied');
        }

        // Get current position with high accuracy
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout for better reliability
        });

        if (!isMounted) return;

        // Reverse geocode using Google Maps API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=AIzaSyDPlj-KWC4RVsBk-wGSDJHZ4ndv7Kfs15o`
        );

        if (!isMounted) return;

        const data = await response.json();
        
        if (data.results[0]) {
          setCurrentLocation({
            address: data.results[0].formatted_address,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('Location access granted');
        }
      } catch (err: any) {
        console.error('Error getting location:', err);
        
        if (!isMounted) return;

        // Provide more specific error messages
        if (err.message.includes('permission denied')) {
          setError('Location access denied. Please enable location services to use all features.');
          toast.error('Location access denied. Some features may be limited.');
        } else if (err.code === 3 || err.message.includes('timeout')) {
          setError('Location request timed out. Please try again.');
          toast.error('Could not get your location. Please try again.');
        } else {
          setError('Failed to get your location');
          toast.error('Failed to get your location. Please set it manually.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Start the location request process immediately
    requestAndFetchLocation();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <LocationContext.Provider value={{ currentLocation, setCurrentLocation, loading, error }}>
      {children}
    </LocationContext.Provider>
  );
}