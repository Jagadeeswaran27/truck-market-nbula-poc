import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import PrivateRoute from './components/PrivateRoute';
import BottomNavigation from './components/BottomNavigation';
import SignupScreen from './screens/SignupScreen';
import EmailVerificationScreen from './screens/EmailVerificationScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MyListingsScreen from './screens/MyListingsScreen';
import AddPostScreen from './screens/AddPostScreen';
import EditPostScreen from './screens/EditPostScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';

function AppContent() {
  const location = useLocation();
  const hideNavigation = ['/login', '/signup', '/verify-email'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/verify-email" element={<EmailVerificationScreen />} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><HomeScreen /></PrivateRoute>} />
        <Route path="/my-listings" element={<PrivateRoute><MyListingsScreen /></PrivateRoute>} />
        <Route path="/add-post" element={<PrivateRoute><AddPostScreen /></PrivateRoute>} />
        <Route path="/edit-product/:id" element={<PrivateRoute><EditPostScreen /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatScreen /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfileScreen /></PrivateRoute>} />
        <Route path="/product/:id" element={<PrivateRoute><ProductDetailsScreen /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNavigation && <BottomNavigation />}
      <Toaster position="top-center" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <AppContent />
        </LocationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;