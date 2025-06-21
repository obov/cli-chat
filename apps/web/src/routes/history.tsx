import { useLoaderData } from 'react-router-dom';

export default function HistoryPage() {
  const history = useLoaderData() as any[];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Chat History</h1>
      <div className="space-y-4">
        {history && history.length > 0 ? (
          history.map((session, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 mb-2">
                {new Date(session.timestamp).toLocaleString()}
              </div>
              <div className="text-gray-800">{session.preview}</div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No chat history yet.</p>
        )}
      </div>
    </div>
  );
}