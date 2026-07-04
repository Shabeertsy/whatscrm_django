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

import { tokenService } from '../api/token';

const savedToken = tokenService.getAccess();
const savedUser = tokenService.getUser();

export const authStore = new Store({
  isAuthenticated: !!savedToken,
  user: savedUser,
  accessToken: savedToken,
  refreshToken: tokenService.getRefresh(),
});

export function useAuthStore() {
  const [state, setState] = useState(authStore.getState());

  useEffect(() => {
    return authStore.subscribe(() => {
      setState(authStore.getState());
    });
  }, []);

  return [state, authStore.setState] as const;
}
