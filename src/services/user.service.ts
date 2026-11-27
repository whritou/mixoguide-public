import bcrypt from 'bcryptjs'
import { userRepository } from '@/repositories/user.repository'
import { NotFoundError, ConflictError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

// Hash of a random value, computed lazily once. Used to equalise timing for unknown users.
let dummyHash: Promise<string> | null = null
function getDummyHash(): Promise<string> {
    dummyHash ??= bcrypt.hash(`${Math.random()}-${Date.now()}`, 12)
    return dummyHash
}

class UserService {
    async getAll(params: QueryParams) {
        return userRepository.findMany(params)
    }

    /** Lookup without throwing; email is normalised to lower case. */
    async findByEmail(email: string) {
        return userRepository.findByEmail(email.trim().toLowerCase())
    }

    async getByEmail(email: string) {
        const user = await userRepository.findByEmail(email)
        if (!user) throw new NotFoundError('User not found')
        return user
    }

    /**
     * Profile + counters. The password hash never leaves this method: callers
     * get a derived `hasPassword` flag instead (SEC-017).
     */
    async getWithStats(id: string) {
        const user = await userRepository.findWithStats(id)
        if (!user) throw new NotFoundError('User not found')
        const { password, ...rest } = user
        const linkedProviders = rest.accounts.map((a) => a.provider)
        return {
            ...rest,
            // A user "has a password" only if one is stored AND they did not sign up
            // via an OAuth provider (identity confirmed by the provider instead).
            hasPassword: password !== null && !linkedProviders.includes('google'),
        }
    }

    /** True when the user must confirm destructive actions with their password. */
    async requiresPasswordConfirmation(id: string): Promise<boolean> {
        const user = await this.getWithStats(id)
        return user.hasPassword
    }

    /** Verify a password for a user id (not email: OAuth sessions may lack one). */
    async verifyPasswordById(id: string, password: string): Promise<boolean> {
        const user = await userRepository.findAuthById(id)
        if (!user?.password) {
            await bcrypt.compare(password, await getDummyHash())
            return false
        }
        return bcrypt.compare(password, user.password)
    }

    async create(data: Prisma.UserCreateInput) {
        data = { ...data, email: data.email.trim().toLowerCase() }
        const existing = await userRepository.findByEmail(data.email)
        if (existing) throw new ConflictError('An account with this email already exists')

        if (data.password) {
            data = { ...data, password: await bcrypt.hash(data.password as string, 12) }
        }

        return userRepository.create(data)
    }

    async update(id: string, data: Prisma.UserUpdateInput) {
        if (data.password && typeof data.password === 'string') {
            data = { ...data, password: await bcrypt.hash(data.password, 12) }
        }
        const user = await userRepository.update(id, data)
        if (!user) throw new NotFoundError('User not found')
        return user
    }

    async delete(id: string) {
        const ok = await userRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('User not found')
    }

    /**
     * Constant-work credential check: a bcrypt comparison always runs, even for
     * unknown emails, so response timing does not reveal registered accounts (SEC-008).
     */
    async verifyPassword(email: string, password: string) {
        const user = await userRepository.findByEmail(email.trim().toLowerCase())
        const valid = await bcrypt.compare(password, user?.password ?? await getDummyHash())
        if (!user?.password || !valid) return null
        return user
    }
}

export const userService = new UserService()
