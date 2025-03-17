import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2, ListOrdered } from 'lucide-react';
import { Location } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: Location) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

type LocationSource = 'google' | 'predefined';

export default function LocationSearchModal({ isOpen, onClose, onLocationSelect }: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [predefinedLocations, setPredefinedLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<LocationSource>('google');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<{
    input: string;
    sessionToken?: google.maps.places.AutocompleteSessionToken;
    region: string;
    language: string;
  }>({
    input: '',
    region: 'in',
    language: 'en'
  });
  const newestRequestIdRef = useRef(0);

  // Initialize session token and fetch predefined locations when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshToken();
      fetchPredefinedLocations();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  const fetchPredefinedLocations = async () => {
    try {
      setLoading(true);
      const locationsRef = collection(db, 'predefinedLocations');
      const snapshot = await getDocs(locationsRef);
      const locations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      setPredefinedLocations(locations);
    } catch (error) {
      console.error('Error fetching predefined locations:', error);
      toast.error('Failed to load donation centers');
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = () => {
    requestRef.current.sessionToken = new google.maps.places.AutocompleteSessionToken();
  };

  const makeAutocompleteRequest = async (value: string) => {
    if (!value.trim() || activeSource === 'predefined') {
      setSuggestions([]);
      return;
    }

    const requestId = ++newestRequestIdRef.current;
    requestRef.current.input = value;

    setLoading(true);
    try {
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        ...requestRef.current,
        locationBias: {
          north: 35.5,
          south: 6.5,
          east: 97.5,
          west: 68.0
        }
      });

      if (requestId !== newestRequestIdRef.current) return;

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to fetch location suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    try {
      setLoading(true);
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });

      const lat = place.location?.lat();
      const lng = place.location?.lng();

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('Invalid location coordinates');
      }

      const mainText = suggestion.placePrediction.text.toString();
      const secondaryText = suggestion.placePrediction.secondaryText?.toString() || '';
      const fullAddress = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

      const location: Location = {
        address: fullAddress,
        latitude: lat,
        longitude: lng,
      };

      onLocationSelect(location);
      setSearchQuery('');
      refreshToken();
      onClose();
    } catch (error) {
      console.error('Error getting location details:', error);
      toast.error('Failed to set location');
    } finally {
      setLoading(false);
    }
  };

  const handlePredefinedLocationSelect = (location: Location) => {
    onLocationSelect(location);
    setSearchQuery('');
    onClose();
  };

  const filteredPredefinedLocations = searchQuery
    ? predefinedLocations.filter(location =>
        location.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : predefinedLocations;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeSource === 'google') {
        makeAutocompleteRequest(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeSource]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-0 right-0 top-0 z-50 h-full max-h-screen overflow-hidden bg-white">
        <div className="sticky top-0 z-50 bg-white border-b">
          <div className="flex items-center gap-2 p-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeSource === 'google' ? "Search for area, street name..." : "Search donation centers..."}
                className="w-full h-11 pl-10 pr-4 rounded-full border border-input bg-white text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300"
              />
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex px-4 pb-4 gap-2">
            <button
              onClick={() => setActiveSource('google')}
              className={cn(
                "flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors",
                activeSource === 'google'
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Google Places
            </button>
            <button
              onClick={() => setActiveSource('predefined')}
              className={cn(
                "flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors",
                activeSource === 'predefined'
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Donation Centers
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeSource === 'google' ? (
            suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placePrediction.placeId}
                    onClick={() => handleLocationSelect(suggestion)}
                    className="w-full flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                  >
                    <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {suggestion.placePrediction.text.toString()}
                      </p>
                      {suggestion.placePrediction.secondaryText && (
                        <p className="text-sm text-muted-foreground">
                          {suggestion.placePrediction.secondaryText.toString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <p className="text-center text-muted-foreground py-8">
                No results found
              </p>
            ) : null
          ) : (
            <div className="space-y-2">
              {filteredPredefinedLocations.length > 0 ? (
                filteredPredefinedLocations.map((location) => (
                  <button
                    key={location.address}
                    onClick={() => handlePredefinedLocationSelect(location)}
                    className="w-full flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                  >
                    <ListOrdered className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{location.address}</p>
                      <p className="text-sm text-muted-foreground">
                        Donation Center
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No donation centers found
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}