import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageCircle, Send, ArrowLeft, CheckCircle2, Tag } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Chat, Message, Product, User } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

function ChatScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [markingAsSold, setMarkingAsSold] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle chat selection from product details
  useEffect(() => {
    const chatId = location.state?.chatId;
    const productId = location.state?.productId;
    
    if (chatId) {
      const fetchChat = async () => {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
          const chat = { id: chatDoc.id, ...chatDoc.data() } as Chat;
          setSelectedChat(chat);
          setShowChatList(false);
        }
      };
      fetchChat();
    }

    if (productId) {
      const fetchProduct = async () => {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          setProductDetails({ id: productDoc.id, ...productDoc.data() } as Product);
        }
      };
      fetchProduct();
    }
  }, [location.state]);

  // Fetch user's chats
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedChats = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();
          const lastMessageTime = chatData.lastMessageTime?.toDate?.() || new Date();
          
          // Fetch product details for each chat
          const productDoc = await getDoc(doc(db, 'products', chatData.productId));
          const productData = productDoc.exists() ? productDoc.data() : null;
          
          // Fetch other user's details
          const otherUserId = chatData.participants?.find(id => id !== currentUser.uid);
          const userDoc = otherUserId ? await getDoc(doc(db, 'users', otherUserId)) : null;
          const userData = userDoc?.exists() ? userDoc.data() as User : null;
          
          return {
            id: chatDoc.id,
            ...chatData,
            lastMessageTime,
            productTitle: productData?.title || 'Unknown Product',
            productImage: productData?.images?.[0] || '',
            otherUserName: userData?.name || 'Unknown User'
          } as Chat;
        })
      );
      
      setChats(fetchedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch messages and other user details for selected chat
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', selectedChat.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date()
        } as Message;
      });
      setMessages(fetchedMessages);
    });

    // Fetch product details if not already loaded
    if (!productDetails && selectedChat.productId) {
      const fetchProduct = async () => {
        const productDoc = await getDoc(doc(db, 'products', selectedChat.productId));
        if (productDoc.exists()) {
          setProductDetails({ id: productDoc.id, ...productDoc.data() } as Product);
        }
      };
      fetchProduct();
    }

    // Fetch other user's details
    const otherUserId = selectedChat.participants?.find(id => id !== currentUser.uid);
    if (otherUserId) {
      const fetchOtherUser = async () => {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          setOtherUser({ id: userDoc.id, ...userDoc.data() } as User);
        }
      };
      fetchOtherUser();
    }

    // Focus message input
    messageInputRef.current?.focus();

    return () => unsubscribe();
  }, [selectedChat, currentUser, productDetails]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim() || !currentUser || sending) return;

    try {
      setSending(true);
      const messageData = {
        chatId: selectedChat.id,
        senderId: currentUser.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      // Update last message in chat
      const chatRef = doc(db, 'chats', selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp()
      });
      
      setNewMessage('');
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatList(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setShowChatList(true);
  };

  const handleMarkAsSold = async () => {
    if (!productDetails || !currentUser || markingAsSold) return;

    // Check if the current user is the seller
    if (productDetails.createdBy !== currentUser.uid) {
      toast.error('Only the seller can mark the product as sold');
      return;
    }

    try {
      setMarkingAsSold(true);

      // Update product status
      const productRef = doc(db, 'products', productDetails.id);
      await updateDoc(productRef, {
        status: 'sold'
      });

      // Add system message about the sale
      await addDoc(collection(db, 'messages'), {
        chatId: selectedChat!.id,
        senderId: 'system',
        text: '🎉 Product has been marked as sold!',
        createdAt: serverTimestamp()
      });

      // Update product details state
      setProductDetails({
        ...productDetails,
        status: 'sold'
      });

      toast.success('Product marked as sold');
    } catch (error) {
      console.error('Error marking product as sold:', error);
      toast.error('Failed to mark product as sold');
    } finally {
      setMarkingAsSold(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {showChatList ? (
        // Chat List View
        <>
          <div className="bg-white shadow">
            <div className="px-4 py-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-20">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No messages yet
              </div>
            ) : (
              <div className="divide-y">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className="w-full p-4 text-left hover:bg-gray-50 focus:outline-none"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={chat.productImage}
                        alt={chat.productTitle}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium text-gray-900">
                            {chat.productTitle}
                          </h3>
                          <span className="text-xs text-gray-400">
                            {format(chat.lastMessageTime, 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {chat.otherUserName}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        // Chat Detail View
        <>
          <div className="bg-white shadow">
            <div className="px-4 py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackToList}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {productDetails && (
                  <div className="flex items-center justify-between flex-1">
                    <div className="flex items-center space-x-3">
                      <img
                        src={productDetails.images[0]}
                        alt={productDetails.title}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                      />
                      <div className="min-w-0">
                        <h2 className="font-medium text-gray-900 truncate">
                          {productDetails.title}
                        </h2>
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            ${productDetails.price.toFixed(2)}
                          </p>
                          {productDetails.status === 'sold' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Sold
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {productDetails.createdBy === currentUser?.uid && 
                     productDetails.status !== 'sold' && (
                      <button
                        onClick={handleMarkAsSold}
                        disabled={markingAsSold}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Mark as Sold</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4 pb-[calc(4rem+2.5rem)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === 'system'
                    ? 'justify-center'
                    : message.senderId === currentUser?.uid
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.senderId === 'system'
                      ? 'bg-green-100 text-green-800 text-center'
                      : message.senderId === currentUser?.uid
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  {message.senderId !== 'system' && (
                    <span className="text-xs opacity-75 mt-1 block">
                      {format(message.createdAt, 'HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="absolute bottom-16 left-0 right-0 bg-white border-t p-4">
            <form onSubmit={sendMessage} className="flex items-center space-x-2">
              <input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 h-12 px-4 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending || productDetails?.status === 'sold'}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || productDetails?.status === 'sold'}
                className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatScreen;