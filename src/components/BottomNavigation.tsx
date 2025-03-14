import { Home, Package, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect flex justify-around items-center h-16 px-4 border-t">
      <button
        onClick={() => navigate('/')}
        className={cn(
          'nav-item',
          isActive('/') && 'nav-item-active'
        )}
      >
        <Home size={24} />
        <span className="text-xs">Home</span>
      </button>
      <button
        onClick={() => navigate('/my-listings')}
        className={cn(
          'nav-item',
          isActive('/my-listings') && 'nav-item-active'
        )}
      >
        <Package size={24} />
        <span className="text-xs">Listings</span>
      </button>
      <button
        onClick={() => navigate('/add-post')}
        className={cn(
          'nav-item',
          isActive('/add-post') && 'nav-item-active'
        )}
      >
        <PlusCircle size={24} />
        <span className="text-xs">Post</span>
      </button>
      <button
        onClick={() => navigate('/chat')}
        className={cn(
          'nav-item',
          isActive('/chat') && 'nav-item-active'
        )}
      >
        <MessageCircle size={24} />
        <span className="text-xs">Chat</span>
      </button>
      <button
        onClick={() => navigate('/profile')}
        className={cn(
          'nav-item',
          isActive('/profile') && 'nav-item-active'
        )}
      >
        <User size={24} />
        <span className="text-xs">Profile</span>
      </button>
    </nav>
  );
}

export default BottomNavigation;