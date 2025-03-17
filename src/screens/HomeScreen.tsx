import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Search, MapPin, Bell, Filter, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { Product, Location } from '../types';
import { cn } from '../lib/utils';
import LocationSearchModal from '../components/LocationSearchModal';

const categories = [
  { id: 'all', name: 'All', icon: '🚛' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'home', name: 'Others', icon: '🏠' },
];

const distanceOptions = [
  { value: '5', label: '< 5km' },
  { value: '10', label: '< 10km' },
  { value: '50', label: '< 50km' },
  { value: 'everywhere', label: 'Everywhere' },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function HomeScreen() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('everywhere');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { currentUser } = useAuth();
  const { currentLocation, setCurrentLocation, loading: locationLoading } = useLocation();
  const navigate = useNavigate();

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        let q = query(
          productsRef,
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );

        if (currentUser) {
          q = query(
            productsRef,
            where('status', '==', 'active'),
            where('createdBy', '!=', currentUser.uid),
            orderBy('createdBy'),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Product[];

        setAllProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    }

    fetchProducts();
  }, [currentUser]);

  // Filter products based on category, distance, and search
  useEffect(() => {
    if (!allProducts.length) return;

    let filtered = [...allProducts];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    }

    // Apply distance filtering if location is available and not set to everywhere
    if (currentLocation && selectedDistance !== 'everywhere') {
      const maxDistance = parseInt(selectedDistance);
      filtered = filtered.filter(product => {
        const dropLocation = product.dropLocations[0];
        if (!dropLocation) return false;
        
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          dropLocation.latitude,
          dropLocation.longitude
        );
        return distance <= maxDistance;
      });
    }

    setFilteredProducts(filtered);
  }, [allProducts, selectedCategory, selectedDistance, searchQuery, currentLocation]);

  const handleLocationSelect = (location: Location) => {
    setCurrentLocation(location);
    setIsLocationModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="header">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">TruckMarket</h1>
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="truncate max-w-[200px]">
              {locationLoading ? 'Getting location...' : currentLocation?.address || 'Set your location'}
            </span>
          </button>
        </div>
        <button className="relative p-2 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
      </header>

      <div className="section">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search products nearby"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full border border-input bg-white text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="button-secondary !px-3 flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              <ChevronDown className="h-4 w-4" />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-2">
                  <div className="px-3 py-2 text-sm font-medium text-gray-500">
                    Distance
                  </div>
                  {distanceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedDistance(option.value);
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md",
                        selectedDistance === option.value
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide -mx-4 px-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center space-x-2 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all",
                selectedCategory === category.id
                  ? "bg-primary text-white"
                  : "bg-white border shadow-sm hover:bg-accent"
              )}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Product List */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found nearby
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="product-card group"
              >
                <div className="relative">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="product-image"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-end">
                      <span className="text-lg font-bold text-white drop-shadow-lg">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="product-info">
                  <h3 className="font-medium text-sm truncate">
                    {product.title}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {product.dropLocations[0]?.address || 'Location not set'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Search Modal */}
      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}

export default HomeScreen;