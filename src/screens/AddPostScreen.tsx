import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Package, Upload, X, MapPin, Plus, Trash2, ArrowLeft, DollarSign } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Product, Location } from '../types';
import LocationSearchModal from '../components/LocationSearchModal';

const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.string().transform((val) => parseFloat(val)),
  condition: z.enum(['New', 'Like New', 'Good', 'Fair']),
  category: z.string().min(1, 'Please select a category'),
});

type ProductFormData = z.infer<typeof productSchema>;

const categories = [
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
];

function AddPostScreen() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dropLocations, setDropLocations] = useState<Location[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      condition: undefined,
      category: '',
    }
  });

  const selectedCategory = watch('category');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      if (images.length + newImages.length > 5) {
        toast.error('Maximum 5 images allowed');
        return;
      }
      setImages([...images, ...newImages]);
      newImages.forEach(image => {
        const url = URL.createObjectURL(image);
        setImageUrls(prev => [...prev, url]);
      });
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imageUrls[index]);
    const newImages = images.filter((_, i) => i !== index);
    const newImageUrls = imageUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImageUrls(newImageUrls);
  };

  const handleLocationSelect = (location: Location) => {
    setDropLocations([...dropLocations, location]);
  };

  const removeLocation = (index: number) => {
    setDropLocations(dropLocations.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const urls = await Promise.all(
      images.map(async (image) => {
        const storageRef = ref(storage, `products/${currentUser.uid}/${Date.now()}-${image.name}`);
        const snapshot = await uploadBytes(storageRef, image);
        return getDownloadURL(snapshot.ref);
      })
    );
    return urls;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    if (dropLocations.length === 0) {
      toast.error('Please add at least one drop location');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    try {
      setLoading(true);
      const imageUrls = await uploadImages();
      console.log({
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        category: data.category,
        images: imageUrls,
        dropLocations: dropLocations,
        status: 'active',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'products'), {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        category: data.category,
        images: imageUrls,
        dropLocations: dropLocations,
        status: 'active',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      toast.success('Product listed successfully');
      navigate('/my-listings');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
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
            <h1 className="text-xl font-semibold text-gray-900">Create Listing</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Images */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Product Images</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative aspect-square group">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    multiple
                  />
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Add Image</span>
                  <span className="text-xs text-gray-400 mt-1">{images.length}/5</span>
                </label>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                {...register('title')}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="What are you selling?"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe your item in detail"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price ($)
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price')}
                  className="block w-full pl-8 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Product Details</h2>

            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                Condition
              </label>
              <select
                {...register('condition')}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
              {errors.condition && (
                <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      {...register('category')}
                      value={category.id}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{category.icon}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.category && (
                <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Drop Locations */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Drop Locations</h2>
            <div className="space-y-3">
              {dropLocations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-900">{location.address}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-full transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Plus className="h-5 w-5" />
                Add Drop Location
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
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

export default AddPostScreen;