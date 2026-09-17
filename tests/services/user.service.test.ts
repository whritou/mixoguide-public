/**
 * User service tests - repositories and bcrypt are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ConflictError } from '@/utils/errors'

const { mockUserRepo, mockBcrypt } = vi.hoisted(() => ({
    mockUserRepo: {
        findMany: vi.fn(),
        findByEmail: vi.fn(),
        findWithStats: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        hardDelete: vi.fn(),
    },
    mockBcrypt: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

vi.mock('@/repositories/user.repository', () => ({ userRepository: mockUserRepo }))
vi.mock('bcryptjs', () => ({ default: mockBcrypt }))

import { userService } from '@/services/user.service'

const UID = 'user-1'
const EMAIL = 'alice@example.com'

describe('UserService.getByEmail', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns the user when found by email', async () => {
        const user = { id: UID, email: EMAIL }
        mockUserRepo.findByEmail.mockResolvedValue(user)
        await expect(userService.getByEmail(EMAIL)).resolves.toBe(user)
    })

    it('throws NotFoundError when email is not registered', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null)
        await expect(userService.getByEmail('nobody@example.com')).rejects.toThrow(NotFoundError)
    })
})

describe('UserService.getWithStats', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns user with stats when found', async () => {
        const user = { id: UID, pantryCount: 5, favoriteCount: 3 }
        mockUserRepo.findWithStats.mockResolvedValue(user)
        await expect(userService.getWithStats(UID)).resolves.toBe(user)
    })

    it('throws NotFoundError when not found', async () => {
        mockUserRepo.findWithStats.mockResolvedValue(null)
        await expect(userService.getWithStats('nonexistent')).rejects.toThrow(NotFoundError)
    })
})

describe('UserService.create', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws ConflictError when email is already in use', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ id: 'existing' })
        await expect(
            userService.create({ email: EMAIL, name: 'Alice' })
        ).rejects.toThrow(ConflictError)
        expect(mockUserRepo.create).not.toHaveBeenCalled()
    })

    it('hashes the password before creating the user', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null)
        mockBcrypt.hash.mockResolvedValue('hashed-pw')
        mockUserRepo.create.mockResolvedValue({ id: UID, email: EMAIL })

        await userService.create({ email: EMAIL, name: 'Alice', password: 'plaintext' })

        expect(mockBcrypt.hash).toHaveBeenCalledWith('plaintext', 12)
        expect(mockUserRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ password: 'hashed-pw' })
        )
    })

    it('creates the user without hashing when no password is provided', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null)
        mockUserRepo.create.mockResolvedValue({ id: UID, email: EMAIL })

        await userService.create({ email: EMAIL, name: 'Alice (OAuth)' })

        expect(mockBcrypt.hash).not.toHaveBeenCalled()
        expect(mockUserRepo.create).toHaveBeenCalled()
    })
})

describe('UserService.update', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('hashes the password when updating it', async () => {
        mockBcrypt.hash.mockResolvedValue('new-hashed')
        const updated = { id: UID, email: EMAIL }
        mockUserRepo.update.mockResolvedValue(updated)

        await userService.update(UID, { password: 'new-plain' })

        expect(mockBcrypt.hash).toHaveBeenCalledWith('new-plain', 12)
        expect(mockUserRepo.update).toHaveBeenCalledWith(
            UID, expect.objectContaining({ password: 'new-hashed' })
        )
    })

    it('throws NotFoundError when repo returns null', async () => {
        mockUserRepo.update.mockResolvedValue(null)
        await expect(userService.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundError)
    })
})

describe('UserService.delete', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('resolves without error on successful delete', async () => {
        mockUserRepo.hardDelete.mockResolvedValue(true)
        await expect(userService.delete(UID)).resolves.not.toThrow()
    })

    it('throws NotFoundError when user does not exist', async () => {
        mockUserRepo.hardDelete.mockResolvedValue(false)
        await expect(userService.delete('nonexistent')).rejects.toThrow(NotFoundError)
    })
})

describe('UserService.verifyPassword', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns null when email is not found', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null)
        await expect(userService.verifyPassword(EMAIL, 'pw')).resolves.toBeNull()
    })

    it('returns null when user has no stored password', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ id: UID, email: EMAIL, password: null })
        await expect(userService.verifyPassword(EMAIL, 'pw')).resolves.toBeNull()
    })

    it('returns null when password does not match', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ id: UID, email: EMAIL, password: 'hashed' })
        mockBcrypt.compare.mockResolvedValue(false)
        await expect(userService.verifyPassword(EMAIL, 'wrong')).resolves.toBeNull()
    })

    it('returns the user when credentials are valid', async () => {
        const user = { id: UID, email: EMAIL, password: 'hashed' }
        mockUserRepo.findByEmail.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(true)
        await expect(userService.verifyPassword(EMAIL, 'correct')).resolves.toBe(user)
    })
})
