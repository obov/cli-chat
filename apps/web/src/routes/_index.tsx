import { useLoaderData } from 'react-router-dom';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatPage() {
  const { session, tools } = useLoaderData() as any;

  return (
    <div className="h-full">
      <ChatInterface session={session} tools={tools} />
    </div>
  );
}