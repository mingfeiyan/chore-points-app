# Philips Hue Light Control Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Philips Hue smart light control to the parent dashboard, allowing parents to control room lights and activate scenes.

**Architecture:** OAuth integration with Hue Cloud API (similar to existing Google Calendar). Tokens stored on Family model. All API calls server-side. Dashboard widget for quick access, full page for detailed control.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Tailwind CSS, next-intl for i18n

---

## Task 1: Database Schema - Add Hue Fields to Family Model

**Files:**
- Modify: `prisma/schema.prisma` (lines 81-108, Family model)

**Step 1: Add Hue token fields to Family model**

In `prisma/schema.prisma`, add these fields to the `Family` model after `mealPlans`:

```prisma
  // Philips Hue integration
  hueAccessToken    String?
  hueRefreshToken   String?
  hueTokenExpiry    DateTime?
  hueUsername       String?
```

**Step 2: Generate Prisma client and create migration**

Run:
```bash
npx prisma migrate dev --name add-hue-integration
```

Expected: Migration created successfully, Prisma client regenerated.

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat(hue): add Hue token fields to Family model"
```

---

## Task 2: Hue API Client Library

**Files:**
- Create: `src/lib/hue.ts`
- Test: `src/__tests__/lib/hue.test.ts`

**Step 1: Write tests for Hue client functions**

Create `src/__tests__/lib/hue.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    family: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { prisma } from '@/lib/db'
import {
  getHueAccessToken,
  exchangeCodeForTokens,
  refreshHueToken,
  HUE_OAUTH_URL,
  HUE_API_URL,
} from '@/lib/hue'

const mockPrisma = vi.mocked(prisma)

describe('Hue API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('getHueAccessToken', () => {
    it('should return existing token if not expired', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: 'valid-token',
        hueRefreshToken: 'refresh-token',
        hueTokenExpiry: futureDate,
        hueUsername: 'hue-user',
      } as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toEqual({
        accessToken: 'valid-token',
        username: 'hue-user',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should refresh token if expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: 'expired-token',
        hueRefreshToken: 'refresh-token',
        hueTokenExpiry: pastDate,
        hueUsername: 'hue-user',
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 604800,
        }),
      })

      mockPrisma.family.update.mockResolvedValue({} as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toEqual({
        accessToken: 'new-token',
        username: 'hue-user',
      })
      expect(mockPrisma.family.update).toHaveBeenCalled()
    })

    it('should return null if no Hue connection', async () => {
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: null,
        hueRefreshToken: null,
        hueTokenExpiry: null,
        hueUsername: null,
      } as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toBeNull()
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange auth code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 604800,
        }),
      })

      const result = await exchangeCodeForTokens('auth-code')

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 604800,
      })
    })

    it('should throw on failed exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code'),
      })

      await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
        'Failed to exchange code for tokens'
      )
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test src/__tests__/lib/hue.test.ts
```

Expected: FAIL - module not found

**Step 3: Create Hue client library**

Create `src/lib/hue.ts`:

```typescript
import { prisma } from "@/lib/db";

export const HUE_OAUTH_URL = "https://api.meethue.com/v2/oauth2";
export const HUE_API_URL = "https://api.meethue.com/route/api";

const HUE_CLIENT_ID = process.env.HUE_CLIENT_ID!;
const HUE_CLIENT_SECRET = process.env.HUE_CLIENT_SECRET!;
const HUE_REDIRECT_URI = process.env.HUE_REDIRECT_URI!;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface HueCredentials {
  accessToken: string;
  username: string;
}

/**
 * Get the OAuth authorization URL for Hue
 */
export function getHueAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: HUE_CLIENT_ID,
    response_type: "code",
    state,
  });
  return `${HUE_OAUTH_URL}/authorize?${params}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(`${HUE_OAUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${HUE_CLIENT_ID}:${HUE_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data: TokenResponse = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshHueToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(`${HUE_OAUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${HUE_CLIENT_ID}:${HUE_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data: TokenResponse = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get a valid access token for the family, refreshing if necessary
 */
export async function getHueAccessToken(
  familyId: string
): Promise<HueCredentials | null> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      hueAccessToken: true,
      hueRefreshToken: true,
      hueTokenExpiry: true,
      hueUsername: true,
    },
  });

  if (!family?.hueAccessToken || !family.hueRefreshToken || !family.hueUsername) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired =
    family.hueTokenExpiry &&
    family.hueTokenExpiry.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    return {
      accessToken: family.hueAccessToken,
      username: family.hueUsername,
    };
  }

  // Refresh the token
  const tokenData = await refreshHueToken(family.hueRefreshToken);

  // Update the family with new token
  await prisma.family.update({
    where: { id: familyId },
    data: {
      hueAccessToken: tokenData.accessToken,
      hueRefreshToken: tokenData.refreshToken,
      hueTokenExpiry: new Date(Date.now() + tokenData.expiresIn * 1000),
    },
  });

  return {
    accessToken: tokenData.accessToken,
    username: family.hueUsername,
  };
}

/**
 * Link the Hue bridge after OAuth (gets the username)
 */
export async function linkHueBridge(accessToken: string): Promise<string> {
  const response = await fetch(`${HUE_API_URL}/0/config`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ linkbutton: true }),
  });

  if (!response.ok) {
    throw new Error("Failed to enable link mode");
  }

  // Create a new user
  const createResponse = await fetch(HUE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ devicetype: "gemsteps#web" }),
  });

  if (!createResponse.ok) {
    throw new Error("Failed to create Hue user");
  }

  const data = await createResponse.json();
  if (data[0]?.success?.username) {
    return data[0].success.username;
  }

  throw new Error("Failed to get Hue username");
}

// Hue API types
export interface HueRoom {
  id: string;
  name: string;
  type: string;
  on: boolean;
  brightness: number;
}

export interface HueScene {
  id: string;
  name: string;
  group?: string;
  type: string;
}

/**
 * Get all rooms/groups from Hue
 */
export async function getHueRooms(
  accessToken: string,
  username: string
): Promise<HueRoom[]> {
  const response = await fetch(`${HUE_API_URL}/${username}/groups`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }

  const data = await response.json();
  const rooms: HueRoom[] = [];

  for (const [id, group] of Object.entries(data)) {
    const g = group as any;
    if (g.type === "Room" || g.type === "Zone") {
      rooms.push({
        id,
        name: g.name,
        type: g.type,
        on: g.state?.any_on || false,
        brightness: Math.round((g.action?.bri || 0) / 254 * 100),
      });
    }
  }

  return rooms;
}

/**
 * Control a room (on/off, brightness)
 */
export async function controlHueRoom(
  accessToken: string,
  username: string,
  roomId: string,
  options: { on?: boolean; brightness?: number }
): Promise<void> {
  const body: Record<string, any> = {};

  if (options.on !== undefined) {
    body.on = options.on;
  }

  if (options.brightness !== undefined) {
    body.bri = Math.round(options.brightness * 254 / 100);
  }

  const response = await fetch(
    `${HUE_API_URL}/${username}/groups/${roomId}/action`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to control room");
  }
}

/**
 * Get all scenes from Hue
 */
export async function getHueScenes(
  accessToken: string,
  username: string
): Promise<HueScene[]> {
  const response = await fetch(`${HUE_API_URL}/${username}/scenes`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch scenes");
  }

  const data = await response.json();
  const scenes: HueScene[] = [];

  for (const [id, scene] of Object.entries(data)) {
    const s = scene as any;
    scenes.push({
      id,
      name: s.name,
      group: s.group,
      type: s.type,
    });
  }

  return scenes;
}

/**
 * Activate a scene
 */
export async function activateHueScene(
  accessToken: string,
  username: string,
  sceneId: string,
  groupId?: string
): Promise<void> {
  const targetGroup = groupId || "0"; // 0 = all lights

  const response = await fetch(
    `${HUE_API_URL}/${username}/groups/${targetGroup}/action`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scene: sceneId }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to activate scene");
  }
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npm test src/__tests__/lib/hue.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hue.ts src/__tests__/lib/hue.test.ts
git commit -m "feat(hue): add Hue API client library with tests"
```

---

## Task 3: OAuth Routes - Auth Initiation and Callback

**Files:**
- Create: `src/app/api/hue/auth/route.ts`
- Create: `src/app/api/hue/callback/route.ts`
- Test: `src/__tests__/api/hue/auth.test.ts`

**Step 1: Write tests for OAuth routes**

Create `src/__tests__/api/hue/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireParentInFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (mockSession.user.role !== 'PARENT') throw new Error('Forbidden')
    if (!mockSession.user.familyId) throw new Error('Forbidden')
    return mockSession
  }),
}))

vi.mock('@/lib/hue', () => ({
  getHueAuthUrl: vi.fn(() => 'https://api.meethue.com/oauth?test=1'),
  exchangeCodeForTokens: vi.fn(),
  linkHueBridge: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    family: {
      update: vi.fn(),
    },
  },
}))

import { GET as authGET } from '@/app/api/hue/auth/route'
import { GET as callbackGET } from '@/app/api/hue/callback/route'
import { exchangeCodeForTokens, linkHueBridge } from '@/lib/hue'
import { prisma } from '@/lib/db'

const mockExchange = vi.mocked(exchangeCodeForTokens)
const mockLink = vi.mocked(linkHueBridge)
const mockPrisma = vi.mocked(prisma)

describe('Hue OAuth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/hue/auth', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await authGET()
      expect(response.status).toBe(401)
    })

    it('should return redirect URL for authenticated parent', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      const response = await authGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toContain('meethue.com')
    })
  })

  describe('GET /api/hue/callback', () => {
    it('should return 400 if no code provided', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      const request = new Request('http://localhost/api/hue/callback')
      const response = await callbackGET(request)

      expect(response.status).toBe(400)
    })

    it('should exchange code and store tokens', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      mockExchange.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 604800,
      })

      mockLink.mockResolvedValue('hue-username')
      mockPrisma.family.update.mockResolvedValue({} as any)

      const request = new Request(
        'http://localhost/api/hue/callback?code=auth-code&state=family-1'
      )
      const response = await callbackGET(request)

      expect(response.status).toBe(302)
      expect(mockPrisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-1' },
        data: expect.objectContaining({
          hueAccessToken: 'access-token',
          hueRefreshToken: 'refresh-token',
          hueUsername: 'hue-username',
        }),
      })
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test src/__tests__/api/hue/auth.test.ts
```

Expected: FAIL - modules not found

**Step 3: Create auth initiation route**

Create `src/app/api/hue/auth/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { getHueAuthUrl } from "@/lib/hue";

export async function GET() {
  try {
    const session = await requireParentInFamily();

    // Use familyId as state for CSRF protection
    const authUrl = getHueAuthUrl(session.user.familyId!);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to initiate Hue authorization" },
      { status: 500 }
    );
  }
}
```

**Step 4: Create callback route**

Create `src/app/api/hue/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { exchangeCodeForTokens, linkHueBridge } from "@/lib/hue";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireParentInFamily();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/settings?hue_error=denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code required" },
        { status: 400 }
      );
    }

    // Verify state matches familyId (CSRF protection)
    if (state !== session.user.familyId) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Link the bridge to get username
    const username = await linkHueBridge(tokens.accessToken);

    // Store tokens in database
    await prisma.family.update({
      where: { id: session.user.familyId! },
      data: {
        hueAccessToken: tokens.accessToken,
        hueRefreshToken: tokens.refreshToken,
        hueTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        hueUsername: username,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?hue_connected=true", request.url)
    );
  } catch (error) {
    console.error("Hue callback error:", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.redirect(
      new URL("/settings?hue_error=failed", request.url)
    );
  }
}
```

**Step 5: Run tests to verify they pass**

Run:
```bash
npm test src/__tests__/api/hue/auth.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/hue/auth/ src/app/api/hue/callback/ src/__tests__/api/hue/
git commit -m "feat(hue): add OAuth auth and callback routes"
```

---

## Task 4: Status and Disconnect Routes

**Files:**
- Create: `src/app/api/hue/status/route.ts`
- Create: `src/app/api/hue/disconnect/route.ts`
- Test: `src/__tests__/api/hue/status.test.ts`

**Step 1: Write tests for status and disconnect**

Create `src/__tests__/api/hue/status.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireParentInFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (mockSession.user.role !== 'PARENT') throw new Error('Forbidden')
    if (!mockSession.user.familyId) throw new Error('Forbidden')
    return mockSession
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    family: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { GET } from '@/app/api/hue/status/route'
import { DELETE } from '@/app/api/hue/disconnect/route'
import { prisma } from '@/lib/db'

const mockPrisma = vi.mocked(prisma)

describe('Hue Status and Disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/hue/status', () => {
    it('should return connected=false when not connected', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: null,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connected).toBe(false)
    })

    it('should return connected=true when connected', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: 'token',
        hueUsername: 'username',
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connected).toBe(true)
    })
  })

  describe('DELETE /api/hue/disconnect', () => {
    it('should clear Hue tokens', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.family.update.mockResolvedValue({} as any)

      const response = await DELETE()

      expect(response.status).toBe(200)
      expect(mockPrisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-1' },
        data: {
          hueAccessToken: null,
          hueRefreshToken: null,
          hueTokenExpiry: null,
          hueUsername: null,
        },
      })
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test src/__tests__/api/hue/status.test.ts
```

Expected: FAIL

**Step 3: Create status route**

Create `src/app/api/hue/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireParentInFamily();

    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId! },
      select: {
        hueAccessToken: true,
        hueUsername: true,
      },
    });

    const connected = !!(family?.hueAccessToken && family?.hueUsername);

    return NextResponse.json({ connected });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to get Hue status" },
      { status: 500 }
    );
  }
}
```

**Step 4: Create disconnect route**

Create `src/app/api/hue/disconnect/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await requireParentInFamily();

    await prisma.family.update({
      where: { id: session.user.familyId! },
      data: {
        hueAccessToken: null,
        hueRefreshToken: null,
        hueTokenExpiry: null,
        hueUsername: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to disconnect Hue" },
      { status: 500 }
    );
  }
}
```

**Step 5: Run tests to verify they pass**

Run:
```bash
npm test src/__tests__/api/hue/status.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/hue/status/ src/app/api/hue/disconnect/ src/__tests__/api/hue/status.test.ts
git commit -m "feat(hue): add status and disconnect routes"
```

---

## Task 5: Rooms API Routes

**Files:**
- Create: `src/app/api/hue/rooms/route.ts`
- Create: `src/app/api/hue/rooms/[id]/route.ts`
- Test: `src/__tests__/api/hue/rooms.test.ts`

**Step 1: Write tests for rooms routes**

Create `src/__tests__/api/hue/rooms.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockContext } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireParentInFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (mockSession.user.role !== 'PARENT') throw new Error('Forbidden')
    if (!mockSession.user.familyId) throw new Error('Forbidden')
    return mockSession
  }),
}))

vi.mock('@/lib/hue', () => ({
  getHueAccessToken: vi.fn(),
  getHueRooms: vi.fn(),
  controlHueRoom: vi.fn(),
}))

import { GET } from '@/app/api/hue/rooms/route'
import { PUT } from '@/app/api/hue/rooms/[id]/route'
import { getHueAccessToken, getHueRooms, controlHueRoom } from '@/lib/hue'

const mockGetToken = vi.mocked(getHueAccessToken)
const mockGetRooms = vi.mocked(getHueRooms)
const mockControl = vi.mocked(controlHueRoom)

describe('Hue Rooms API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/hue/rooms', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await GET()
      expect(response.status).toBe(401)
    })

    it('should return 400 if Hue not connected', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue(null)

      const response = await GET()
      expect(response.status).toBe(400)
    })

    it('should return rooms list', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue({
        accessToken: 'token',
        username: 'user',
      })
      mockGetRooms.mockResolvedValue([
        { id: '1', name: 'Living Room', type: 'Room', on: true, brightness: 80 },
        { id: '2', name: 'Bedroom', type: 'Room', on: false, brightness: 0 },
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rooms).toHaveLength(2)
      expect(data.rooms[0].name).toBe('Living Room')
    })
  })

  describe('PUT /api/hue/rooms/[id]', () => {
    it('should control room on/off', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue({
        accessToken: 'token',
        username: 'user',
      })
      mockControl.mockResolvedValue(undefined)

      const request = createMockRequest('PUT', { on: false })
      const context = createMockContext({ id: '1' })
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
      expect(mockControl).toHaveBeenCalledWith('token', 'user', '1', { on: false })
    })

    it('should control room brightness', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue({
        accessToken: 'token',
        username: 'user',
      })
      mockControl.mockResolvedValue(undefined)

      const request = createMockRequest('PUT', { brightness: 50 })
      const context = createMockContext({ id: '1' })
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
      expect(mockControl).toHaveBeenCalledWith('token', 'user', '1', { brightness: 50 })
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test src/__tests__/api/hue/rooms.test.ts
```

Expected: FAIL

**Step 3: Create rooms list route**

Create `src/app/api/hue/rooms/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { getHueAccessToken, getHueRooms } from "@/lib/hue";

export async function GET() {
  try {
    const session = await requireParentInFamily();

    const credentials = await getHueAccessToken(session.user.familyId!);
    if (!credentials) {
      return NextResponse.json(
        { error: "Hue not connected" },
        { status: 400 }
      );
    }

    const rooms = await getHueRooms(
      credentials.accessToken,
      credentials.username
    );

    return NextResponse.json({ rooms });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
```

**Step 4: Create room control route**

Create `src/app/api/hue/rooms/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { getHueAccessToken, controlHueRoom } from "@/lib/hue";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await context.params;

    const credentials = await getHueAccessToken(session.user.familyId!);
    if (!credentials) {
      return NextResponse.json(
        { error: "Hue not connected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { on, brightness } = body;

    const options: { on?: boolean; brightness?: number } = {};
    if (on !== undefined) options.on = on;
    if (brightness !== undefined) options.brightness = brightness;

    await controlHueRoom(
      credentials.accessToken,
      credentials.username,
      id,
      options
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to control room" },
      { status: 500 }
    );
  }
}
```

**Step 5: Run tests to verify they pass**

Run:
```bash
npm test src/__tests__/api/hue/rooms.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/hue/rooms/ src/__tests__/api/hue/rooms.test.ts
git commit -m "feat(hue): add rooms list and control routes"
```

---

## Task 6: Scenes API Routes

**Files:**
- Create: `src/app/api/hue/scenes/route.ts`
- Create: `src/app/api/hue/scenes/[id]/activate/route.ts`
- Test: `src/__tests__/api/hue/scenes.test.ts`

**Step 1: Write tests for scenes routes**

Create `src/__tests__/api/hue/scenes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, createMockContext } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireParentInFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (mockSession.user.role !== 'PARENT') throw new Error('Forbidden')
    if (!mockSession.user.familyId) throw new Error('Forbidden')
    return mockSession
  }),
}))

vi.mock('@/lib/hue', () => ({
  getHueAccessToken: vi.fn(),
  getHueScenes: vi.fn(),
  activateHueScene: vi.fn(),
}))

import { GET } from '@/app/api/hue/scenes/route'
import { POST } from '@/app/api/hue/scenes/[id]/activate/route'
import { getHueAccessToken, getHueScenes, activateHueScene } from '@/lib/hue'

const mockGetToken = vi.mocked(getHueAccessToken)
const mockGetScenes = vi.mocked(getHueScenes)
const mockActivate = vi.mocked(activateHueScene)

describe('Hue Scenes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/hue/scenes', () => {
    it('should return scenes list', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue({
        accessToken: 'token',
        username: 'user',
      })
      mockGetScenes.mockResolvedValue([
        { id: 's1', name: 'Relax', type: 'GroupScene', group: '1' },
        { id: 's2', name: 'Energize', type: 'GroupScene', group: '1' },
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes).toHaveLength(2)
    })
  })

  describe('POST /api/hue/scenes/[id]/activate', () => {
    it('should activate scene', async () => {
      mockSession = {
        user: { id: 'user-1', role: Role.PARENT, familyId: 'family-1' },
      }
      mockGetToken.mockResolvedValue({
        accessToken: 'token',
        username: 'user',
      })
      mockActivate.mockResolvedValue(undefined)

      const request = createMockRequest('POST', { groupId: '1' })
      const context = createMockContext({ id: 's1' })
      const response = await POST(request, context)

      expect(response.status).toBe(200)
      expect(mockActivate).toHaveBeenCalledWith('token', 'user', 's1', '1')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test src/__tests__/api/hue/scenes.test.ts
```

Expected: FAIL

**Step 3: Create scenes list route**

Create `src/app/api/hue/scenes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { getHueAccessToken, getHueScenes } from "@/lib/hue";

export async function GET() {
  try {
    const session = await requireParentInFamily();

    const credentials = await getHueAccessToken(session.user.familyId!);
    if (!credentials) {
      return NextResponse.json(
        { error: "Hue not connected" },
        { status: 400 }
      );
    }

    const scenes = await getHueScenes(
      credentials.accessToken,
      credentials.username
    );

    return NextResponse.json({ scenes });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to fetch scenes" },
      { status: 500 }
    );
  }
}
```

**Step 4: Create scene activation route**

Create `src/app/api/hue/scenes/[id]/activate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireParentInFamily } from "@/lib/permissions";
import { getHueAccessToken, activateHueScene } from "@/lib/hue";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();
    const { id } = await context.params;

    const credentials = await getHueAccessToken(session.user.familyId!);
    if (!credentials) {
      return NextResponse.json(
        { error: "Hue not connected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { groupId } = body;

    await activateHueScene(
      credentials.accessToken,
      credentials.username,
      id,
      groupId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to activate scene" },
      { status: 500 }
    );
  }
}
```

**Step 5: Run tests to verify they pass**

Run:
```bash
npm test src/__tests__/api/hue/scenes.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/hue/scenes/ src/__tests__/api/hue/scenes.test.ts
git commit -m "feat(hue): add scenes list and activation routes"
```

---

## Task 7: i18n Translations

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add English translations**

Add to `src/locales/en.json` (add a new "hue" section):

```json
  "hue": {
    "title": "Smart Lights",
    "connect": "Connect Philips Hue",
    "connectDesc": "Control your Philips Hue lights from the dashboard",
    "disconnect": "Disconnect",
    "disconnecting": "Disconnecting...",
    "connected": "Connected",
    "notConnected": "Not Connected",
    "connectError": "Failed to connect",
    "connectDenied": "Connection was denied",
    "rooms": "Rooms",
    "scenes": "Scenes",
    "noRooms": "No rooms found. Set up rooms in the Hue app first.",
    "noScenes": "No scenes available",
    "allOff": "All Off",
    "on": "On",
    "off": "Off",
    "brightness": "Brightness",
    "loading": "Loading lights...",
    "error": "Failed to load lights",
    "retry": "Retry",
    "refresh": "Refresh",
    "seeAll": "See all",
    "unavailable": "Hue unavailable",
    "reconnect": "Reconnect"
  },
```

**Step 2: Add Chinese translations**

Add to `src/locales/zh.json` (add a new "hue" section):

```json
  "hue": {
    "title": "智能灯光",
    "connect": "连接飞利浦Hue",
    "connectDesc": "从仪表板控制您的飞利浦Hue灯光",
    "disconnect": "断开连接",
    "disconnecting": "断开中...",
    "connected": "已连接",
    "notConnected": "未连接",
    "connectError": "连接失败",
    "connectDenied": "连接被拒绝",
    "rooms": "房间",
    "scenes": "场景",
    "noRooms": "未找到房间。请先在Hue应用中设置房间。",
    "noScenes": "没有可用场景",
    "allOff": "全部关闭",
    "on": "开",
    "off": "关",
    "brightness": "亮度",
    "loading": "加载灯光中...",
    "error": "加载灯光失败",
    "retry": "重试",
    "refresh": "刷新",
    "seeAll": "查看全部",
    "unavailable": "Hue不可用",
    "reconnect": "重新连接"
  },
```

**Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat(hue): add i18n translations for Hue integration"
```

---

## Task 8: Dashboard Widget Component

**Files:**
- Create: `src/components/lights/LightsWidget.tsx`

**Step 1: Create the widget component**

Create `src/components/lights/LightsWidget.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type Room = {
  id: string;
  name: string;
  type: string;
  on: boolean;
  brightness: number;
};

type Scene = {
  id: string;
  name: string;
  group?: string;
  type: string;
};

export default function LightsWidget() {
  const t = useTranslations("hue");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/hue/status");
      const data = await response.json();
      setIsConnected(data.connected);

      if (data.connected) {
        await fetchLights();
      }
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLights = async () => {
    try {
      const [roomsRes, scenesRes] = await Promise.all([
        fetch("/api/hue/rooms"),
        fetch("/api/hue/scenes"),
      ]);

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData.rooms.slice(0, 4)); // Show max 4 rooms
      }

      if (scenesRes.ok) {
        const scenesData = await scenesRes.json();
        setScenes(scenesData.scenes.slice(0, 3)); // Show max 3 scenes
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/hue/auth");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t("connectError"));
      setIsConnecting(false);
    }
  };

  const toggleRoom = async (roomId: string, currentState: boolean) => {
    // Optimistic update
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, on: !currentState } : room
      )
    );

    try {
      const response = await fetch(`/api/hue/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !currentState }),
      });

      if (!response.ok) {
        // Revert on failure
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, on: currentState } : room
          )
        );
      }
    } catch {
      // Revert on failure
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, on: currentState } : room
        )
      );
    }
  };

  const activateScene = async (sceneId: string, groupId?: string) => {
    try {
      await fetch(`/api/hue/scenes/${sceneId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      // Refresh room states after scene activation
      fetchLights();
    } catch {
      // Silent fail for scene activation
    }
  };

  const turnAllOff = async () => {
    // Turn off all rooms
    for (const room of rooms.filter((r) => r.on)) {
      await toggleRoom(room.id, true);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4 text-gray-500">{t("loading")}</div>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              checkStatus();
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4">
          <p className="text-gray-500 mb-4">{t("connectDesc")}</p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? "..." : t("connect")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <Link
          href="/lights"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {t("seeAll")}
        </Link>
      </div>

      {/* Quick Scenes */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={turnAllOff}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          {t("allOff")}
        </button>
        {scenes.slice(0, 2).map((scene) => (
          <button
            key={scene.id}
            onClick={() => activateScene(scene.id, scene.group)}
            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
          >
            {scene.name}
          </button>
        ))}
      </div>

      {/* Room Controls */}
      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noRooms")}</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-900">{room.name}</span>
              <button
                onClick={() => toggleRoom(room.id, room.on)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  room.on ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    room.on ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/lights/
git commit -m "feat(hue): add LightsWidget dashboard component"
```

---

## Task 9: Full Lights Page

**Files:**
- Create: `src/components/lights/LightsPageContent.tsx`
- Create: `src/app/(parent)/lights/page.tsx`

**Step 1: Create the page content component**

Create `src/components/lights/LightsPageContent.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Room = {
  id: string;
  name: string;
  type: string;
  on: boolean;
  brightness: number;
};

type Scene = {
  id: string;
  name: string;
  group?: string;
  type: string;
};

export default function LightsPageContent() {
  const t = useTranslations("hue");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsRes, scenesRes] = await Promise.all([
        fetch("/api/hue/rooms"),
        fetch("/api/hue/scenes"),
      ]);

      if (!roomsRes.ok || !scenesRes.ok) {
        throw new Error("Failed to fetch");
      }

      const roomsData = await roomsRes.json();
      const scenesData = await scenesRes.json();

      setRooms(roomsData.rooms);
      setScenes(scenesData.scenes);
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLights();
  }, [fetchLights]);

  const toggleRoom = async (roomId: string, currentState: boolean) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, on: !currentState } : room
      )
    );

    try {
      const response = await fetch(`/api/hue/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !currentState }),
      });

      if (!response.ok) {
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, on: currentState } : room
          )
        );
      }
    } catch {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, on: currentState } : room
        )
      );
    }
  };

  const setBrightness = async (roomId: string, brightness: number) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, brightness } : room
      )
    );

    try {
      await fetch(`/api/hue/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brightness }),
      });
    } catch {
      // Silent fail, state already updated optimistically
    }
  };

  const activateScene = async (sceneId: string, groupId?: string) => {
    try {
      await fetch(`/api/hue/scenes/${sceneId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      fetchLights();
    } catch {
      // Silent fail
    }
  };

  // Group scenes by room
  const scenesByRoom = scenes.reduce<Record<string, Scene[]>>((acc, scene) => {
    const groupKey = scene.group || "all";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(scene);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">{t("loading")}</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchLights}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rooms Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t("rooms")}</h2>
          <button
            onClick={fetchLights}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("refresh")}
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-gray-500">{t("noRooms")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`bg-white rounded-lg shadow p-4 transition-all ${
                  room.on ? "ring-2 ring-blue-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{room.name}</span>
                  <button
                    onClick={() => toggleRoom(room.id, room.on)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.on ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        room.on ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {room.on && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 block mb-1">
                      {t("brightness")}: {room.brightness}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={room.brightness}
                      onChange={(e) =>
                        setRooms((prev) =>
                          prev.map((r) =>
                            r.id === room.id
                              ? { ...r, brightness: Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      onMouseUp={(e) =>
                        setBrightness(room.id, Number((e.target as HTMLInputElement).value))
                      }
                      onTouchEnd={(e) =>
                        setBrightness(room.id, Number((e.target as HTMLInputElement).value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scenes Section */}
      {scenes.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t("scenes")}
          </h2>

          {Object.entries(scenesByRoom).map(([groupId, groupScenes]) => {
            const room = rooms.find((r) => r.id === groupId);
            const groupName = room?.name || "All Rooms";

            return (
              <div key={groupId} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {groupName}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {groupScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => activateScene(scene.id, scene.group)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition"
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
```

**Step 2: Create the page**

Create `src/app/(parent)/lights/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import LightsPageContent from "@/components/lights/LightsPageContent";

export default async function LightsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  // Check if Hue is connected
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: { hueAccessToken: true },
  });

  if (!family?.hueAccessToken) {
    redirect("/settings?hue_error=not_connected");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <LightsPageContent />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/lights/LightsPageContent.tsx src/app/\(parent\)/lights/
git commit -m "feat(hue): add full lights control page"
```

---

## Task 10: Settings Page Integration

**Files:**
- Modify: `src/app/(parent)/settings/page.tsx`
- Modify: `src/components/parent/SettingsPageContent.tsx`

**Step 1: Update settings page to pass Hue status**

Modify `src/app/(parent)/settings/page.tsx` to include Hue connection status:

After the family query (line 21-33), add:

```typescript
  const isHueConnected = !!family?.hueAccessToken;
```

Then update the SettingsPageContent props:

```typescript
      <SettingsPageContent
        familyName={family?.name || ""}
        inviteCode={family?.inviteCode || ""}
        kids={kids}
        isHueConnected={isHueConnected}
      />
```

Also update the Family query to include `hueAccessToken`:

```typescript
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      hueAccessToken: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
```

Wait, that's invalid - can't use both `include` and `select`. Change to:

```typescript
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      hueAccessToken: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
```

**Step 2: Update SettingsPageContent to show Hue settings**

Add to props type in `src/components/parent/SettingsPageContent.tsx`:

```typescript
type Props = {
  familyName: string;
  inviteCode: string;
  kids: Kid[];
  isHueConnected: boolean;
};
```

Add Hue state and handlers after existing state:

```typescript
  const [hueConnected, setHueConnected] = useState(isHueConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnectHue = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/hue/auth");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error("Failed to initiate Hue connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectHue = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/hue/disconnect", { method: "DELETE" });
      if (response.ok) {
        setHueConnected(false);
      }
    } catch {
      console.error("Failed to disconnect Hue");
    } finally {
      setIsDisconnecting(false);
    }
  };
```

Add Smart Home section after Badge Management (before closing `</>`):

```typescript
      {/* Smart Home */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("smartHome")}
        </h2>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium text-gray-900">Philips Hue</div>
            <div className="text-sm text-gray-500">
              {hueConnected ? tHue("connected") : tHue("notConnected")}
            </div>
          </div>
          {hueConnected ? (
            <button
              onClick={handleDisconnectHue}
              disabled={isDisconnecting}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {isDisconnecting ? tHue("disconnecting") : tHue("disconnect")}
            </button>
          ) : (
            <button
              onClick={handleConnectHue}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? "..." : tHue("connect")}
            </button>
          )}
        </div>
      </div>
```

Add the translations import:

```typescript
  const tHue = useTranslations("hue");
```

Also add "smartHome" to en.json and zh.json settings section:

In `src/locales/en.json`, add to "settings" object:
```json
    "smartHome": "Smart Home"
```

In `src/locales/zh.json`, add to "settings" object:
```json
    "smartHome": "智能家居"
```

**Step 3: Commit**

```bash
git add src/app/\(parent\)/settings/page.tsx src/components/parent/SettingsPageContent.tsx src/locales/
git commit -m "feat(hue): add Hue settings to settings page"
```

---

## Task 11: Add Widget to Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Import and add LightsWidget to dashboard**

Add import at top of `src/app/dashboard/page.tsx`:

```typescript
import LightsWidget from "@/components/lights/LightsWidget";
```

In the parent dashboard section (around line 31-40), add LightsWidget to the grid:

```typescript
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FamilyTodoList />
              <LightsWidget />
            </div>
            <PhotoCarousel />
```

**Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(hue): add LightsWidget to parent dashboard"
```

---

## Task 12: Final Integration Test

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Run linter**

```bash
npm run lint
```

Expected: No errors

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address lint/type errors in Hue integration"
```

---

## Summary

This plan implements the Philips Hue light control feature in 12 tasks:

1. **Database Schema** - Add Hue token fields to Family model
2. **Hue API Client** - Core library for Hue API interactions
3. **OAuth Routes** - Auth initiation and callback handling
4. **Status/Disconnect Routes** - Check connection and disconnect
5. **Rooms Routes** - List and control rooms
6. **Scenes Routes** - List and activate scenes
7. **i18n Translations** - English and Chinese translations
8. **Dashboard Widget** - Compact widget for quick access
9. **Full Lights Page** - Detailed control page
10. **Settings Integration** - Connect/disconnect UI in settings
11. **Dashboard Integration** - Add widget to parent dashboard
12. **Final Testing** - Verify all tests pass

Each task follows TDD with small, commitable steps.
