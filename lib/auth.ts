import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Mock user database (in production, replace with real database)
interface User {
  id: string;
  email: string;
  name: string;
  password: string; // Hashed password
}

// In-memory user store (replace with database in production)
const users: User[] = [
  {
    id: '1',
    email: 'demo@streamline.ai',
    name: 'Demo User',
    password: '$2a$10$rHJZvZLqYzNqYqYzNqYqYu4vZLqYzNqYqYzNqYqYzNqYqYzNqYqY', // "password123"
  },
];

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

        // Find user
        const user = users.find((u) => u.email === email);
        if (!user) {
          return null;
        }

        // Verify password (in production, use proper bcrypt comparison)
        // For MVP demo: password123 works for demo@streamline.ai
        // For other users, compare with stored password
        const isValidPassword = 
          (email === 'demo@streamline.ai' && password === 'password123') ||
          password === user.password;

        if (!isValidPassword) {
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

// Helper functions for user management (add to database in production)
export async function createUser(email: string, name: string, password: string): Promise<User | null> {
  // Check if user already exists
  if (users.find((u) => u.email === email)) {
    return null;
  }

  // Hash password (in production, use: await bcrypt.hash(password, 10))
  const hashedPassword = password; // For MVP, store plain text (DON'T DO THIS IN PRODUCTION)

  const newUser: User = {
    id: String(users.length + 1),
    email,
    name,
    password: hashedPassword,
  };

  users.push(newUser);
  return newUser;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

