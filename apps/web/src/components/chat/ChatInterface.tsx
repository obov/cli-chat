import { useChat } from '../../hooks/useChat';
import MessageList from './MessageList';
import InputBox from './InputBox';

interface ChatInterfaceProps {
  session?: any;
  tools?: any[];
}

export default function ChatInterface({ session, tools }: ChatInterfaceProps) {
  const { messages, isConnected, isStreaming, sendMessage, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          Disconnected from server. Attempting to reconnect...
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isStreaming={isStreaming} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
          {tools && tools.length > 0 && (
            <span className="ml-auto">
              {tools.length} tools available
            </span>
          )}
        </div>
        <InputBox 
          onSend={sendMessage}
          disabled={!isConnected || isStreaming}
          placeholder={isStreaming ? "Waiting for response..." : "Type your message..."}
        />
        <div className="px-4 py-2 flex justify-end">
          <button
            onClick={clearMessages}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear chat
          </button>
        </div>
      </div>
    </div>
  );
}