import { Suspense } from "react";
import ChatClient from "./ChatClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading chat…</div>}>
      <ChatClient />
    </Suspense>
  );
}
