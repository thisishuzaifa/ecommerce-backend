import { auth } from '../utils/auth'

export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'customer'
  emailVerified: boolean
}

export type AuthUser = User 