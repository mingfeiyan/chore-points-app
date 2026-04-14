import { Role, RedemptionStatus } from '@prisma/client'

// Helper to generate unique IDs
let idCounter = 0
export function generateId(prefix = 'test'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`
}

export function resetIdCounter() {
  idCounter = 0
}

// User fixtures
export function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('user'),
    email: `user-${idCounter}@example.com`,
    name: `Test User ${idCounter}`,
    password: 'hashedpassword',
    role: Role.PARENT,
    familyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createParent(overrides: Record<string, unknown> = {}) {
  return createUser({ role: Role.PARENT, ...overrides })
}

export function createKid(overrides: Record<string, unknown> = {}) {
  return createUser({ role: Role.KID, ...overrides })
}

// Family fixtures
export function createFamily(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('family'),
    name: `Test Family ${idCounter}`,
    inviteCode: `INVITE-${idCounter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Chore fixtures
export function createChore(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('chore'),
    title: `Test Chore ${idCounter}`,
    icon: null,
    defaultPoints: 5,
    isActive: true,
    familyId: 'family-1',
    createdById: 'parent-1',
    updatedById: 'parent-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Point entry fixtures
export function createPointEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('point'),
    points: 5,
    note: null,
    photoUrl: null,
    date: new Date(),
    familyId: 'family-1',
    kidId: 'kid-1',
    choreId: null,
    redemptionId: null,
    createdById: 'parent-1',
    updatedById: 'parent-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Reward fixtures
export function createReward(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('reward'),
    title: `Test Reward ${idCounter}`,
    description: null,
    pointCost: 50,
    imageUrl: null,
    isActive: true,
    familyId: 'family-1',
    createdById: 'parent-1',
    updatedById: 'parent-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Redemption fixtures
export function createRedemption(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('redemption'),
    status: RedemptionStatus.PENDING,
    familyId: 'family-1',
    kidId: 'kid-1',
    rewardId: 'reward-1',
    createdById: 'kid-1',
    updatedById: 'kid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Invite fixtures
export function createInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId('invite'),
    email: `invite-${idCounter}@example.com`,
    token: `token-${generateId()}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    usedAt: null,
    userId: null,
    createdAt: new Date(),
    ...overrides,
  }
}
