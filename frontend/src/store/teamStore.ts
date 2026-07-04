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

export const teamStore = new Store({
  credits: 1250,
  currentTenant: "Acme SaaS",
  theme: "light" as "light" | "dark",
  teamMembers: [
    { id: "tm1", name: "Shabeer Ahmed", email: "shabeer@whatsaas.io", role: "Owner", status: "Active" },
    { id: "tm2", name: "Sarah Connor", email: "sarah@whatsaas.io", role: "Admin", status: "Active" },
    { id: "tm3", name: "John Connor", email: "john@whatsaas.io", role: "Member", status: "Pending" }
  ] as TeamMember[]
});

export function useTeamStore() {
  const [state, setState] = useState(teamStore.getState());

  useEffect(() => {
    return teamStore.subscribe(() => {
      setState(teamStore.getState());
    });
  }, []);

  return [state, teamStore.setState] as const;
}
