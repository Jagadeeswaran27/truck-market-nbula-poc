import { Home, Package, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect">
      <div className="flex items-center justify-between w-full max-w-lg mx-auto px-4 h-16 relative">
        {/* Left Section */}
        <div className="flex items-center justify-center gap-10">
          <button
            onClick={() => navigate('/')}
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all',
              isActive('/') 
                ? 'text-primary drop-shadow-[0_8px_16px_rgba(37,99,235,0.5)]' 
                : 'text-gray-400 hover:text-gray-600 hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]'
            )}
          >
            <Home size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            onClick={() => navigate('/my-listings')}
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all',
              isActive('/my-listings') 
                ? 'text-primary drop-shadow-[0_8px_16px_rgba(37,99,235,0.5)]' 
                : 'text-gray-400 hover:text-gray-600 hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]'
            )}
          >
            <Package size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Listings</span>
          </button>
        </div>

        {/* Prominent Post Button */}
        <button
          onClick={() => navigate('/add-post')}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center w-14 h-14 rounded-full transition-all',
            isActive('/add-post')
              ? 'bg-primary/90 text-white scale-105 shadow-[0_8px_20px_-2px_rgba(37,99,235,0.5)]'
              : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-[0_8px_20px_-2px_rgba(37,99,235,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(37,99,235,0.5)]'
          )}
        >
          <PlusCircle size={54} strokeWidth={1} className="drop-shadow-[0_4px_8px_rgba(255,255,255,0.5)]" />
        </button>

        {/* Right Section */}
        <div className="flex items-center justify-center gap-10">
          <button
            onClick={() => navigate('/chat')}
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all',
              isActive('/chat') 
                ? 'text-primary drop-shadow-[0_8px_16px_rgba(37,99,235,0.5)]' 
                : 'text-gray-400 hover:text-gray-600 hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]'
            )}
          >
            <MessageCircle size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Chat</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all',
              isActive('/profile') 
                ? 'text-primary drop-shadow-[0_8px_16px_rgba(37,99,235,0.5)]' 
                : 'text-gray-400 hover:text-gray-600 hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]'
            )}
          >
            <User size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default BottomNavigation;