import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Design Request</h1>
        <p className="text-muted-foreground">
          Tell us what you need and we&apos;ll help create the perfect brief.
        </p>
      </div>

      <ChatInterface />
    </div>
  );
}
