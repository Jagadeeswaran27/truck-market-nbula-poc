import { createContext, useContext, useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Location } from '../types';
import toast from 'react-hot-toast';

interface LocationContextType {
  currentLocation: Location | null;
  setCurrentLocation: (location: Location) => void;
  loading: boolean;
  error: string | null;
  requestLocationPermission: () => Promise<void>;
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
  const [currentLocation, _setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Wrapper for setCurrentLocation that also handles loading state
  const setCurrentLocation = (location: Location) => {
    setLoading(false); // Clear loading state when location is manually set
    setError(null); // Clear any previous errors
    _setCurrentLocation(location);
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const permission = await Geolocation.requestPermissions();
      setPermissionRequested(true);

      if (permission.location === 'granted') {
        await getCurrentPosition();
      } else {
        throw new Error('Location permission denied');
      }
    } catch (err: any) {
      console.error('Error requesting location permission:', err);
      setError('Location permission denied');
      setLoading(false); // Make sure to set loading to false on error
      toast.error('Location access denied. Some features may be limited.');
    }
  };

  const getCurrentPosition = async () => {
    try {
      setLoading(true); // Set loading state when getting position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      // Reverse geocode using Google Maps API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=AIzaSyDPlj-KWC4RVsBk-wGSDJHZ4ndv7Kfs15o`
      );

      const data = await response.json();
      
      if (data.results[0]) {
        _setCurrentLocation({
          address: data.results[0].formatted_address,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false); // Clear loading state after successful location update
        toast.success('Location updated successfully');
      } else {
        throw new Error('No address found for this location');
      }
    } catch (err: any) {
      console.error('Error getting current position:', err);
      if (err.code === 1) {
        setError('Location permission denied');
        toast.error('Location access denied. Some features may be limited.');
      } else if (err.code === 2) {
        setError('Location is not available');
        toast.error('Location is not available. Please check your device settings.');
      } else if (err.code === 3) {
        setError('Location request timed out');
        toast.error('Location request timed out. Please try again.');
      } else {
        setError('Failed to get location');
        toast.error('Failed to get your location. Please try again.');
      }
      setLoading(false); // Make sure to set loading to false on error
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeLocation() {
      try {
        const permissionStatus = await Geolocation.checkPermissions();
        
        if (permissionStatus.location === 'granted') {
          if (mounted) {
            await getCurrentPosition();
          }
        } else if (!permissionRequested) {
          if (mounted) {
            await requestLocationPermission();
          }
        } else {
          // If permission was previously requested but denied, set loading to false
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing location:', err);
        if (mounted) {
          setError('Failed to initialize location services');
          setLoading(false);
        }
      }
    }

    initializeLocation();

    return () => {
      mounted = false;
    };
  }, [permissionRequested]);

  const value = {
    currentLocation,
    setCurrentLocation, // Use the wrapper function
    loading,
    error,
    requestLocationPermission
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}