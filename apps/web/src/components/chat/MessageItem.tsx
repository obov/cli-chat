import type { ChatMessage } from '@cli-chatbot/shared';

interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function MessageItem({ message, isStreaming }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] rounded-lg px-4 py-2
          ${isUser ? 'bg-primary text-white' : ''}
          ${isSystem ? 'bg-gray-100 text-gray-600 text-sm italic' : ''}
          ${!isUser && !isSystem ? 'bg-gray-200 text-gray-900' : ''}
        `}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-gray-500 animate-pulse" />
          )}
        </div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}