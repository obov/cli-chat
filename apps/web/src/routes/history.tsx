import { useLoaderData } from 'react-router-dom';

export default function HistoryPage() {
  const history = useLoaderData() as any[];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Chat History</h1>
      <div className="space-y-4">
        {history && history.length > 0 ? (
          history.map((session, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-gray-500">
                  {new Date(session.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  {session.messageCount} messages
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">First message:</div>
                <div className="text-gray-700 font-medium">
                  {session.firstMessage}
                </div>
              </div>
              
              <div className="border-t pt-2">
                <div className="text-xs text-gray-500 mb-1">Last response:</div>
                <div className="text-gray-600 text-sm">
                  {session.preview}
                </div>
              </div>
              
              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>👤 {session.userMessageCount} messages</span>
                <span>🤖 {session.assistantMessageCount} responses</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No chat history yet.</p>
            <p className="text-sm text-gray-400">Start a conversation to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
}