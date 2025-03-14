import { useNavigate } from 'react-router-dom';
import { Truck, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

function EmailVerificationScreen() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // If user is verified, redirect to home
    if (currentUser.emailVerified) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Don't render anything while checking auth state
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Truck className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center space-y-4">
            <Mail className="h-16 w-16 text-blue-600" />
            <p className="text-center text-gray-700">
              We've sent a verification email to:
              <br />
              <span className="font-medium">{currentUser.email}</span>
            </p>
            <p className="text-sm text-center text-gray-500">
              Please check your email and click the verification link to complete your registration.
              You won't be able to access the app until your email is verified.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationScreen;