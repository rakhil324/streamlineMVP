import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    const { email, name, password } = parsed.data;

    try {
      const user = await createUser(email, name, password);

      return NextResponse.json(
        { message: 'User created successfully', user: { id: user.id, email: user.email, name: user.name } },
        { status: 201 }
      );
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the account' },
      { status: 500 }
    );
  }
}

