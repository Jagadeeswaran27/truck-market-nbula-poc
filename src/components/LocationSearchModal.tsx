import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { Location } from '../types';
import toast from 'react-hot-toast';

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

export default function LocationSearchModal({ isOpen, onClose, onLocationSelect }: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Initialize session token when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshToken();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  const refreshToken = () => {
    requestRef.current.sessionToken = new google.maps.places.AutocompleteSessionToken();
  };

  const makeAutocompleteRequest = async (value: string) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const requestId = ++newestRequestIdRef.current;
    requestRef.current.input = value;

    setLoading(true);
    try {
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        ...requestRef.current,
        // Add locationBias for India
        locationBias: {
          // Rough bounding box for India
          north: 35.5,  // Northern-most latitude
          south: 6.5,   // Southern-most latitude
          east: 97.5,   // Eastern-most longitude
          west: 68.0    // Western-most longitude
        }
      });

      // If this request has been superseded by a newer one, don't update the state
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

      // Get the location coordinates
      const lat = place.location?.lat();
      const lng = place.location?.lng();

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('Invalid location coordinates');
      }

      // Construct the full address from the suggestion text and secondary text
      const mainText = suggestion.placePrediction.text.toString();
      const secondaryText = suggestion.placePrediction.secondaryText?.toString() || '';
      const fullAddress = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

      const location: Location = {
        address: fullAddress,
        latitude: lat,
        longitude: lng,
      };

      onLocationSelect(location);
      setSearchQuery(''); // Clear the search input
      refreshToken(); // Get a new token for the next search
      onClose();
    } catch (error) {
      console.error('Error getting location details:', error);
      toast.error('Failed to set location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      makeAutocompleteRequest(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
                placeholder="Search for area, street name..."
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
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : suggestions.length > 0 ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}