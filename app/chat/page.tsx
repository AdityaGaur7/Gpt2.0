import Sidebar from "@/components/sidebar";
import ChatContainer from "@/components/chat-container";

export default function ChatPage() {
  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-dvh">
        <aside className="hidden md:block border-r overflow-y-auto">
          <Sidebar />
        </aside>
        <main className="min-h-0 flex flex-col">
          <ChatContainer />
        </main>
      </div>
    </div>
  );
}
