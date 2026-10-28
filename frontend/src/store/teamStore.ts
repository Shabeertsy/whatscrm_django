import { useState, useEffect } from 'react';

type Listener = () => void;

class Store<T> {
  private state: T;
  private listeners = new Set<Listener>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = () => this.state;
  setState = (nextState: Partial<T> | ((state: T) => Partial<T>)) => {
    const next = typeof nextState === 'function' ? nextState(this.state) : nextState;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const savedTheme = (typeof window !== "undefined" ? localStorage.getItem("theme") : null) as "light" | "dark" | null;
const initialTheme: "light" | "dark" = savedTheme === "dark" ? "dark" : "light";
if (typeof document !== "undefined" && initialTheme === "dark") {
  document.documentElement.classList.add("dark");
}

export const teamStore = new Store({
  credits: 1250,
  currentTenant: "Acme SaaS",
  theme: initialTheme,
  teamMembers: [
    { id: "tm1", name: "Shabeer Ahmed", email: "shabeer@whatsaas.io", role: "Owner", status: "Active" },
    { id: "tm2", name: "Sarah Connor", email: "sarah@whatsaas.io", role: "Admin", status: "Active" },
    { id: "tm3", name: "John Connor", email: "john@whatsaas.io", role: "Member", status: "Pending" }
  ] as TeamMember[]
});

export function toggleTheme() {
  const current = teamStore.getState().theme;
  const next = current === "dark" ? "light" : "dark";
  teamStore.setState({ theme: next });
  if (typeof window !== "undefined") {
    localStorage.setItem("theme", next);
  }
  if (typeof document !== "undefined") {
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
  return next;
}

export function useTeamStore() {
  const [state, setState] = useState(teamStore.getState());

  useEffect(() => {
    return teamStore.subscribe(() => {
      setState(teamStore.getState());
    });
  }, []);

  return [state, teamStore.setState] as const;
}
