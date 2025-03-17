import { createContext, useContext, useState, useEffect } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Location } from "../types";
import toast from "react-hot-toast";

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
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, _setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false); // Start with false to not block initial render
  const [error, setError] = useState<string | null>(null);

  // Wrapper for setCurrentLocation that also handles loading state
  const setCurrentLocation = (location: Location) => {
    setLoading(false);
    setError(null);
    _setCurrentLocation(location);
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      setError(null);

      const permission = await Geolocation.requestPermissions();

      if (permission.location === "granted") {
        await getCurrentPosition();
      } else {
        throw new Error("Location permission denied");
      }
    } catch (err: any) {
      console.error("Error requesting location permission:", err);
      setError("Location permission denied");
      setLoading(false);
      toast.error("Location access denied. Some features may be limited.");
    }
  };

  const getCurrentPosition = async () => {
    try {
      setLoading(true);
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      });

      // Add retry logic for reverse geocoding
      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=AIzaSyDPlj-KWC4RVsBk-wGSDJHZ4ndv7Kfs15o`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.results[0]) {
            _setCurrentLocation({
              address: data.results[0].formatted_address,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            success = true;
          } else {
            throw new Error("No address found for this location");
          }
        } catch (err) {
          attempt++;
          if (attempt === maxRetries) {
            throw err;
          }
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    } catch (err: any) {
      console.error("Error getting current position:", err);
      let errorMessage = "Failed to get your location. Please try again.";

      if (err.code === 1) {
        errorMessage = "Location access denied. Some features may be limited.";
      } else if (err.code === 2) {
        errorMessage = "Location is not available. Please check your device settings.";
      } else if (err.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function initializeLocation() {
      try {
        const permissionStatus = await Geolocation.checkPermissions();

        if (permissionStatus.location === "granted") {
          if (mounted) {
            await getCurrentPosition();
          }
        } else {
          if (mounted) {
            // Don't automatically request permission, wait for user interaction
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error initializing location:", err);
        if (mounted) {
          setError("Failed to initialize location services");
          setLoading(false);
        }
      }
    }

    timeoutId = setTimeout(() => {
      initializeLocation();
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const value = {
    currentLocation,
    setCurrentLocation,
    loading,
    error,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}