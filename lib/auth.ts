import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

// Global user store (shared across the application)
// This is populated from file storage via API routes
declare global {
  var userStore: User[] | undefined;
}

// Initialize with demo user
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    email: 'demo@streamline.ai',
    name: 'Demo User',
    password: 'demo123',
  },
];

// Get users from global store
export function getUsers(): User[] {
  if (!global.userStore) {
    global.userStore = [...DEFAULT_USERS];
  }
  return global.userStore;
}

// Set users in global store
export function setUsers(users: User[]): void {
  global.userStore = users;
}

// Add a user to the store
export function addUser(user: User): void {
  const users = getUsers();
  users.push(user);
  global.userStore = users;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Get users from global store
        const users = getUsers();

        // Find user
        const user = users.find((u) => u.email === email);
        if (!user) {
          console.log('User not found:', email);
          return null;
        }

        // Verify password
        const isValidPassword = password === user.password;

        if (!isValidPassword) {
          console.log('Invalid password for user:', email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET || 'your-secret-key-change-in-production',
});

// Helper function for user management (called from API routes)
export async function createUser(email: string, name: string, password: string): Promise<User | null> {
  const users = getUsers();

  // Check if user already exists
  if (users.find((u) => u.email === email)) {
    return null;
  }

  // Create new user
  const newUser: User = {
    id: `user-${Date.now()}`,
    email,
    name,
    password,
  };

  // Add to global store
  addUser(newUser);

  console.log('User created:', email);
  return newUser;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

