import React, { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { COMMAND_KEY } from '../../utils/platform'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose
}) => {
  // Chat messages state with localStorage persistence
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>(() => {
    // Try to load saved messages from localStorage
    try {
      const saved = localStorage.getItem('chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Input state
  const [inputText, setInputText] = useState('');
  
  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);
  
  // Function to add a new message to the chat
  const addChatMessage = (role: 'user' | 'assistant', content: string) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setChatMessages(prev => [...prev, {
      role,
      content,
      timestamp
    }]);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Add user message to chat
    addChatMessage('user', inputText);
    
    // Clear input
    setInputText('');
    
    // Placeholder response
    setTimeout(() => {
      addChatMessage('assistant', 'This is a placeholder response. Chat functionality will be implemented in a future update.');
    }, 1000);
  };
  
  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-full left-[157.5%] mt-[20px] w-[930px] transform -translate-x-1/2"
      style={{ zIndex: 100 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="absolute -top-2 left-0 w-full h-2" />
      <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 cursor-default select-none">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-white/90 select-none cursor-default">
              Chat
            </h3>
            <button
              onClick={() => {
                // Clear chat messages
                setChatMessages([]);
                // Clear localStorage
                localStorage.removeItem('chat_history');
              }}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-default"
              title="Clear conversation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-white/70"
              >
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          
          {/* Chat Message Area */}
          <div className="space-y-2 h-[419px] overflow-y-auto flex flex-col p-1">
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'assistant' 
                      ? 'bg-neutral-800/80 text-white/90 rounded-bl-none' 
                      : 'bg-blue-600/80 text-white rounded-br-none'
                  }`}
                >
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  <div className="text-[10px] text-white/50 mt-1 text-right">{message.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Input Area */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full p-3 pr-10 h-[60px] max-h-[120px] bg-neutral-800/50 border border-white/10 rounded-lg resize-none text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button
              onClick={handleSendMessage}
              className="h-[60px] w-[60px] flex items-center justify-center bg-white hover:bg-white/80 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel; 