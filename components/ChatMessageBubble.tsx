import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, Role } from '../types';
import { Bot, User, AlertCircle } from 'lucide-react';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-gray-700' : 'bg-enchanted-accent'
        }`}>
          {isUser ? <User className="w-5 h-5 text-gray-300" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
            isUser 
              ? 'bg-gray-700 text-white rounded-tr-none' 
              : message.isError 
                ? 'bg-red-900/20 border border-red-500/30 text-red-200 rounded-tl-none'
                : 'bg-enchanted-surface border border-white/5 text-gray-200 rounded-tl-none'
          }`}>
            {message.isError ? (
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{message.text}</span>
                </div>
            ) : (
                <div className="markdown-body">
                    <ReactMarkdown
                        components={{
                            code({className, children, ...props}) {
                                return (
                                    <code className={`${className} bg-black/30 rounded px-1 py-0.5 text-enchanted-accent font-mono text-xs`} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            pre({children}) {
                                return <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto my-2 border border-white/10">{children}</pre>
                            }
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                </div>
            )}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};