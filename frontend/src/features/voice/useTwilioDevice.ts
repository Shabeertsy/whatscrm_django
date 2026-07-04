import { useEffect } from "react";

export function useTwilioDevice() {
  useEffect(() => {
    console.log("Twilio WebRTC Voice device initialized");
    return () => {
      console.log("Twilio WebRTC Voice device destroyed");
    };
  }, []);
}

export default useTwilioDevice;
