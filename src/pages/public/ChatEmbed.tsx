import { ChatWidget } from '@/components/chat/ChatWidget';

const ChatEmbed = () => {
  return (
    <div className="h-screen w-full bg-background">
      <ChatWidget embedded />
    </div>
  );
};

export default ChatEmbed;