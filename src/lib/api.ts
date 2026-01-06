const API_BASE = {
  auth: 'https://functions.poehali.dev/0de3797c-41ce-4651-ac48-1bf4eb504566',
  promises: 'https://functions.poehali.dev/a47581aa-ef8b-48e1-a512-4dd2c6fd4ceb',
  feed: 'https://functions.poehali.dev/b5047701-a120-44d2-b3a9-b390bf8153b9'
};

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface Promise {
  id: number;
  user_id: number;
  title: string;
  description: string;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  category: string;
  progress: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Activity {
  id: number;
  type: 'created' | 'completed' | 'failed' | 'achievement_unlocked';
  created_at: string;
  user: User;
  promise?: {
    id: number;
    title: string;
    category: string;
  };
}

class API {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(url: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(initData: string): Promise<{ token: string; user: User }> {
    const data = await this.request(API_BASE.auth, {
      method: 'POST',
      body: JSON.stringify({ initData })
    });
    
    this.setToken(data.token);
    return data;
  }

  async getPromises(): Promise<Promise[]> {
    return this.request(API_BASE.promises);
  }

  async createPromise(promise: {
    title: string;
    description: string;
    deadline: string;
    category: string;
    is_public?: boolean;
  }): Promise<Promise> {
    return this.request(API_BASE.promises, {
      method: 'POST',
      body: JSON.stringify(promise)
    });
  }

  async updatePromise(id: number, updates: {
    status?: string;
    progress?: number;
  }): Promise<Promise> {
    return this.request(API_BASE.promises, {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates })
    });
  }

  async getFeed(limit = 50, offset = 0): Promise<{
    activities: Activity[];
    limit: number;
    offset: number;
    count: number;
  }> {
    return this.request(`${API_BASE.feed}?limit=${limit}&offset=${offset}`);
  }
}

export const api = new API();
