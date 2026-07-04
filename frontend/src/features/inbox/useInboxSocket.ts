import { useEffect } from "react";

export function useInboxSocket() {
  useEffect(() => {
    // WebSocket placeholder
    console.log("WebSocket connected for inbox live updates");
    return () => {
      console.log("WebSocket disconnected");
    };
  }, []);
}

export default useInboxSocket;
