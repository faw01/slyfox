import React, { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { COMMAND_KEY } from '../../utils/platform'

// Helper function to determine if the model is a Gemini model
const isGeminiModel = (modelId: string): boolean => {
  return modelId.toLowerCase().includes('gemini');
};

// Helper function to determine if the model is an OpenAI model
const isOpenAIModel = (modelId: string): boolean => {
  return modelId.toLowerCase().includes('gpt') || 
         modelId.toLowerCase().includes('o1') || 
         modelId.toLowerCase().includes('o3');
};

// Helper function to determine if model supports web search
const supportsWebSearch = (modelId: string): boolean => {
  return isGeminiModel(modelId) || isOpenAIModel(modelId);
};

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
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sources?: Array<{title?: string; url: string}>;
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
  // Search toggle state
  const [useSearch, setUseSearch] = useState(false);
  // Teleprompter history availability state
  const [hasTeleprompterHistory, setHasTeleprompterHistory] = useState(false);
  // Solution data availability state
  const [hasSolutionData, setHasSolutionData] = useState(false);
  
  // Get the current model to check if it's a Gemini model
  const currentModel = window.__CHAT_MODEL__ || "";
  const isGeminiModelActive = isGeminiModel(currentModel);
  
  // Check for teleprompter history and solution data on mount and when the panel opens
  useEffect(() => {
    if (isOpen) {
      checkTeleprompterHistory();
      checkSolutionData();
    }
  }, [isOpen]);
  
  // Function to check if teleprompter history exists
  const checkTeleprompterHistory = () => {
    try {
      const teleprompterHistory = localStorage.getItem('teleprompter_chat_history');
      if (teleprompterHistory) {
        const messages = JSON.parse(teleprompterHistory);
        setHasTeleprompterHistory(Array.isArray(messages) && messages.length > 0);
      } else {
        setHasTeleprompterHistory(false);
      }
    } catch (error) {
      console.error('Error checking teleprompter history:', error);
      setHasTeleprompterHistory(false);
    }
  };
  
  // Function to check if solution data exists
  const checkSolutionData = () => {
    try {
      // Check if problem info exists in localStorage
      const problemInfo = localStorage.getItem('problem_info');
      const solutionData = localStorage.getItem('solution_data');
      
      setHasSolutionData(!!(problemInfo && solutionData));
    } catch (error) {
      console.error('Error checking solution data:', error);
      setHasSolutionData(false);
    }
  };
  
  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);
  
  // Function to add a new message to the chat
  const addChatMessage = (role: 'user' | 'assistant', content: string, sources?: Array<{title?: string; url: string}>) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const newMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp,
      sources
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    
    // Save to localStorage
    try {
      const storedMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
      localStorage.setItem('chatMessages', JSON.stringify([...storedMessages, newMessage]));
    } catch (error) {
      console.error('Error saving chat message to localStorage:', error);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Add user message to chat
    addChatMessage('user', inputText);
    
    // Store the input, then clear it
    const messageToSend = inputText.trim();
    setInputText('');
    
    try {
      // Get the selected chat model
      const selectedModel = window.__CHAT_MODEL__ || "gpt-4o";
      
      // Convert UI message format to API format
      // Only include previous messages, not the one just added
      const previousMessages = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Determine if we should use search (only for Gemini models)
      const shouldUseSearch = useSearch && isGeminiModel(selectedModel);
      if (shouldUseSearch) {
        console.log("Using web search with Gemini model:", selectedModel);
      }
      
      // Call the AI model with the user's message and conversation history
      const response = await window.electronAPI.generateChatResponse({
        model: selectedModel,
        message: messageToSend,
        history: previousMessages,
        useSearch: shouldUseSearch
      });
      
      if (response.success && response.data) {
        // Add the AI response to chat
        addChatMessage('assistant', response.data, response.sources);
      } else {
        // Handle error
        addChatMessage('assistant', `Sorry, I encountered an error: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating chat response:', error);
      addChatMessage('assistant', 'Sorry, something went wrong while generating a response.');
    }
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
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'assistant' 
                      ? 'bg-neutral-800 text-white/90 rounded-bl-none border border-neutral-700' 
                      : 'bg-neutral-700 text-white/90 rounded-br-none border border-neutral-600'
                  }`}
                >
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Display sources if available */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 text-xs border-t border-white/20 pt-2">
                      <div className="font-semibold text-white/80">Sources:</div>
                      <ul className="list-disc pl-4">
                        {message.sources.map((source, index) => (
                          <li key={index} className="text-white/70">
                            <button 
                              onClick={() => window.electronAPI.openExternal(source.url)}
                              className="text-blue-300 hover:underline cursor-pointer"
                            >
                              {source.title || source.url}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className={`text-[10px] mt-1 text-right ${
                    message.role === 'assistant' ? 'text-neutral-400' : 'text-neutral-300'
                  }`}>{message.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Import Buttons Container */}
          <div className="flex justify-start mb-2 gap-2 pl-1">
            {/* Import from Teleprompter Button */}
            <button 
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-default ${
                hasTeleprompterHistory 
                  ? 'bg-white hover:bg-white/90 text-black' 
                  : 'bg-neutral-700 hover:bg-neutral-700 text-neutral-400'
              }`}
              title="Import the latest question from Teleprompter"
              onClick={() => {
                try {
                  // Get teleprompter chat history from localStorage
                  const teleprompterHistory = localStorage.getItem('teleprompter_chat_history');
                  if (!teleprompterHistory) {
                    console.log('No teleprompter history found');
                    return;
                  }
                  
                  // Parse the teleprompter history
                  const teleprompterMessages = JSON.parse(teleprompterHistory) as Array<{
                    role: 'interviewer' | 'assistant';
                    content: string;
                    timestamp: string;
                  }>;
                  if (!teleprompterMessages.length) {
                    console.log('Teleprompter history is empty');
                    return;
                  }
                  
                  // Add a separator message
                  addChatMessage('assistant', '--- Imported Teleprompter Conversation ---');
                  
                  // Add each teleprompter message to chat
                  teleprompterMessages.forEach(msg => {
                    // Convert teleprompter roles to chat roles
                    const role = msg.role === 'interviewer' ? 'user' : 'assistant';
                    // Add the message to chat
                    addChatMessage(role, msg.content);
                  });
                  
                  console.log('Successfully imported teleprompter conversation');
                } catch (error) {
                  console.error('Error importing teleprompter conversation:', error);
                }
                
                // Re-check teleprompter history after import
                checkTeleprompterHistory();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"></path>
              </svg>
              <span>Import from Teleprompter</span>
            </button>
            
            {/* Import from Solution Button */}
            <button 
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-default ${
                hasSolutionData 
                  ? 'bg-white hover:bg-white/90 text-black' 
                  : 'bg-neutral-700 hover:bg-neutral-700 text-neutral-400'
              }`}
              title="Import solution and problem extraction data"
              onClick={() => {
                try {
                  // Get problem info and solution data from localStorage
                  const problemInfoStr = localStorage.getItem('problem_info');
                  const solutionDataStr = localStorage.getItem('solution_data');
                  
                  if (!problemInfoStr || !solutionDataStr) {
                    console.log('No solution data found');
                    return;
                  }
                  
                  // Parse the data
                  const problemInfo = JSON.parse(problemInfoStr);
                  const solutionData = JSON.parse(solutionDataStr);
                  
                  // Add a separator message
                  addChatMessage('assistant', '--- Imported Solution Data ---');
                  
                  // Add problem info
                  if (problemInfo) {
                    addChatMessage('user', `Problem: ${problemInfo.title}\n\n${problemInfo.description}`);
                    
                    // Add examples if available
                    if (problemInfo.examples && problemInfo.examples.length > 0) {
                      const examplesText = problemInfo.examples.map((ex: any, i: number) => 
                        `Example ${i+1}:\nInput: ${ex.input}\nOutput: ${ex.output}\n${ex.explanation ? `Explanation: ${ex.explanation}` : ''}`
                      ).join('\n\n');
                      
                      addChatMessage('user', `Examples:\n${examplesText}`);
                    }
                    
                    // Add constraints if available
                    if (problemInfo.constraints && problemInfo.constraints.length > 0) {
                      addChatMessage('user', `Constraints:\n${problemInfo.constraints.join('\n')}`);
                    }
                  }
                  
                  // Add solution data
                  if (solutionData) {
                    // Add approach/pattern if available
                    if (solutionData.pattern) {
                      addChatMessage('assistant', `Algorithm Pattern: ${solutionData.pattern}`);
                    }
                    
                    // Add solution approach
                    if (solutionData.approach) {
                      addChatMessage('assistant', `Approach:\n${solutionData.approach}`);
                    }
                    
                    // Add solution code
                    if (solutionData.solution) {
                      addChatMessage('assistant', `Solution:\n\`\`\`\n${solutionData.solution}\n\`\`\``);
                    }
                    
                    // Add complexity analysis
                    if (solutionData.complexity) {
                      const { time, space } = solutionData.complexity;
                      addChatMessage('assistant', `Complexity Analysis:\nTime: ${time}\nSpace: ${space}`);
                    }
                  }
                  
                  console.log('Successfully imported solution data');
                } catch (error) {
                  console.error('Error importing solution data:', error);
                }
                
                // Re-check solution data after import
                checkSolutionData();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                <path d="M9 9h1"></path>
                <path d="M9 13h6"></path>
                <path d="M9 17h6"></path>
              </svg>
              <span>Import from Solution</span>
            </button>
          </div>
          
          {/* Input Area */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                className="w-full p-3 pr-10 h-[60px] max-h-[120px] bg-neutral-900/80 border border-white/10 rounded-lg resize-none text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 placeholder:text-white/40 cursor-default"
              />
            </div>
            
            {/* Web Search Toggle Button (Only visible for models that support search) */}
            {supportsWebSearch(currentModel) && (
              <button
                onClick={() => setUseSearch(!useSearch)}
                title={useSearch ? "Web search enabled" : "Web search disabled"}
                className={`h-[60px] px-3 flex items-center justify-center gap-2 ${
                  useSearch ? 'bg-white hover:bg-white/90' : 'bg-neutral-700/80 hover:bg-neutral-700/90'
                } rounded-lg transition-colors cursor-default`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={useSearch ? "black" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className={`text-xs whitespace-nowrap ${useSearch ? 'text-black' : 'text-white/90'}`}>Search</span>
              </button>
            )}
            
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              className={`h-[60px] w-[60px] flex items-center justify-center rounded-lg transition-colors cursor-default ${
                inputText.trim() ? 'bg-white hover:bg-white/90' : 'bg-neutral-700 hover:bg-neutral-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() ? "black" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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