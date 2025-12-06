import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authenticateUser, getUserWithBranches, type UserRole } from '@/lib/auth'

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: number
      email: string
      firstName: string
      lastName: string
      role: UserRole | null
      status: string
      branches: string[]
    }
  }
  
  interface User {
    id: number
    email: string
    firstName: string
    lastName: string
    role: UserRole | null
    status: string
    branches?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number
    email: string
    firstName: string
    lastName: string
    role: UserRole | null
    status: string
    branches: string[]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password')
        }

        const result = await authenticateUser(credentials.email, credentials.password)
        
        if (!result.success || !result.user) {
          throw new Error(result.error || 'Invalid credentials')
        }

        const user = result.user

        // Get user's branch access
        const userWithBranches = await getUserWithBranches(user.id)

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          branches: userWithBranches?.branches || []
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as number
        token.email = user.email as string
        token.firstName = user.firstName as string
        token.lastName = user.lastName as string
        token.role = user.role as UserRole | null
        token.status = user.status as string
        token.branches = (user.branches as string[]) || []
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        status: token.status,
        branches: token.branches
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 1 week
  },
  secret: process.env.NEXTAUTH_SECRET,
}

