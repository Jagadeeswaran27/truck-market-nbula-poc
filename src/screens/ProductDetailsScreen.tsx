import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Package, MapPin, MessageSquare, Star, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Chat, User } from '../types';
import toast from 'react-hot-toast';

function ProductDetailsScreen() {
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProductAndSeller() {
      if (!id) return;

      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        if (!productDoc.exists()) {
          toast.error('Product not found');
          navigate('/');
          return;
        }

        const productData = { id: productDoc.id, ...productDoc.data() } as Product;
        setProduct(productData);

        const sellerDoc = await getDoc(doc(db, 'users', productData.createdBy));
        if (sellerDoc.exists()) {
          setSeller({ id: sellerDoc.id, ...sellerDoc.data() } as User);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    }

    fetchProductAndSeller();
  }, [id, navigate]);

  const startChat = async () => {
    if (!product || !currentUser || !seller) return;

    try {
      setChatLoading(true);

      // Check if chat already exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.uid),
        where('productId', '==', product.id)
      );
      const querySnapshot = await getDocs(q);

      let chatId: string;

      if (!querySnapshot.empty) {
        // Chat exists, use existing chat
        chatId = querySnapshot.docs[0].id;
      } else {
        // Create new chat
        const chatData: Omit<Chat, 'id'> = {
          productId: product.id,
          buyerId: currentUser.uid,
          sellerId: seller.id,
          participants: [currentUser.uid, seller.id],
          lastMessage: 'Chat started',
          lastMessageTime: new Date(),
          unreadCount: 0,
          productTitle: product.title,
          productImage: product.images[0],
          otherUserName: seller.name
        };

        const newChatRef = await addDoc(collection(db, 'chats'), chatData);
        chatId = newChatRef.id;

        // Add initial system message
        await addDoc(collection(db, 'messages'), {
          chatId,
          senderId: currentUser.uid,
          text: 'Hi, I am interested in your product!',
          createdAt: serverTimestamp()
        });
      }

      // Navigate to chat screen with chat and product info
      navigate('/chat', {
        state: {
          chatId,
          productId: product.id
        }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product || !seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Product Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Image Gallery */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="aspect-w-16 aspect-h-9">
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="p-4 grid grid-cols-4 gap-4">
              {product.images.slice(1).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${product.title} ${index + 2}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {product.title}
            </h2>
            <p className="text-3xl font-bold text-blue-600 mb-6">
              ${product.price.toFixed(2)}
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                <p className="mt-1 text-sm text-gray-900">{product.condition}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="mt-1 text-sm text-gray-900">{product.category}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm text-gray-900">{product.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                  <span>{product.dropLocations[0]?.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{seller.name}</h3>
                <div className="flex items-center mt-1">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-sm text-gray-500">
                    {seller.rating.toFixed(1)} · {seller.salesCount} sales
                  </span>
                </div>
              </div>
              {currentUser?.uid !== seller.id && (
                <button
                  onClick={startChat}
                  disabled={chatLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {chatLoading ? 'Starting Chat...' : 'Message Seller'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsScreen;