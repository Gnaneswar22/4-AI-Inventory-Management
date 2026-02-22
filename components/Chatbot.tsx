import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { useData } from '../context/DataContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: 'Hello! I\'m **Invenio AI**. I can analyze your stock levels and suggest restocking strategies.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { products, sales, predictions } = useData();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(userMsg.text, { products, sales, predictions });
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "Sorry, I encountered an error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Improved Markdown Parser
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    
    return (
      <div className="space-y-1">
        {lines.map((line, lineIndex) => {
          if (!line.trim()) return <div key={lineIndex} className="h-2" />; // Handle empty lines

          // Check for bullet points (* or -)
          const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
          const cleanLine = isBullet ? line.trim().substring(2) : line;
          
          // Parse bold (**text**)
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
          const content = parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return <span key={partIndex}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={lineIndex} className="flex gap-2 ml-2 items-start">
                <span className="text-indigo-400 mt-2 w-1.5 h-1.5 bg-current rounded-full flex-shrink-0" />
                <span className="leading-relaxed">{content}</span>
              </div>
            );
          }

          return <p key={lineIndex} className="leading-relaxed">{content}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[550px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 flex justify-between items-center text-white shadow-lg flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Invenio Assistant</h3>
                <div className="flex items-center gap-1.5 opacity-80">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-none'
                  }`}
                >
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={14} />
                  <span className="text-xs text-slate-500 font-medium">Analyzing data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about your inventory..."
                className="flex-1 px-3 py-2 bg-transparent border-none focus:ring-0 text-sm text-slate-800 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-slate-800 text-white' : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100 duration-1000"></div>
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
};

export default Chatbot;