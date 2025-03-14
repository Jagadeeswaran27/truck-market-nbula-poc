import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Package, MapPin, Edit2, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function MyListingsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMyListings() {
      if (!currentUser) return;

      try {
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef,
          where('createdBy', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Convert Firestore Timestamp to JavaScript Date
          const createdAt = data.createdAt?.toDate?.() || null;
          return {
            id: doc.id,
            ...data,
            createdAt
          };
        }) as Product[];

        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching listings:', error);
        toast.error('Failed to load your listings');
      } finally {
        setLoading(false);
      }
    }

    fetchMyListings();
  }, [currentUser]);

  const handleEdit = (productId: string) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { status: 'deleted' });
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete listing');
    }
  };

  const toggleStatus = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'sold' : 'active';
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { status: newStatus });
      setProducts(products.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
      toast.success(`Listing marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update listing status');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    try {
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">My Listings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 mb-6">
              Start selling by creating your first listing
            </p>
            <button
              onClick={() => navigate('/add-post')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:border-gray-300 transition-colors"
              >
                <div className="flex">
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-1">
                          {product.title}
                        </h3>
                        <div className="flex items-baseline gap-2 mb-2">
                          <p className="text-lg font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status === 'active' ? 'Active' : 'Sold'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {product.dropLocations[0]?.address || 'Location not set'}
                          </span>
                        </div>
                        {product.createdAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            Listed {formatDate(product.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center">
                  <button
                    onClick={() => toggleStatus(product.id, product.status)}
                    className={`text-sm font-medium ${
                      product.status === 'active'
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {product.status === 'active' ? 'Mark as Sold' : 'Mark as Active'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => navigate('/add-post')}
          className="fixed right-4 bottom-20 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default MyListingsScreen;