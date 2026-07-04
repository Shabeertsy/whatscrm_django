export interface Message {
  id: string;
  sender: "user" | "bot" | "customer";
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: Message[];
}

export const initialChats: Chat[] = [
  {
    id: "1",
    name: "John Doe",
    phone: "+1 (555) 234-5678",
    lastMessage: "Thanks, the automation flow worked perfectly!",
    time: "10:24 AM",
    unread: true,
    messages: [
      { id: "m1", sender: "customer", text: "Hello! How can I setup my account?", timestamp: "10:15 AM" },
      { id: "m2", sender: "bot", text: "Hi John! I've sent you the onboarding flow links to your email.", timestamp: "10:16 AM" },
      { id: "m3", sender: "customer", text: "Thanks, the automation flow worked perfectly!", timestamp: "10:24 AM" }
    ]
  },
  {
    id: "2",
    name: "Alice Smith",
    phone: "+44 7911 123456",
    lastMessage: "Can you trigger a manual invoice retry?",
    time: "9:15 AM",
    unread: false,
    messages: [
      { id: "m4", sender: "customer", text: "Can you trigger a manual invoice retry?", timestamp: "9:15 AM" }
    ]
  },
  {
    id: "3",
    name: "Bob Johnson",
    phone: "+49 170 1234567",
    lastMessage: "WABA campaign lead entry confirmed.",
    time: "Yesterday",
    unread: false,
    messages: [
      { id: "m5", sender: "bot", text: "Your campaign confirmation number is WABA-9921.", timestamp: "Yesterday" },
      { id: "m6", sender: "customer", text: "WABA campaign lead entry confirmed.", timestamp: "Yesterday" }
    ]
  }
];
