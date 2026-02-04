import { prisma } from "@/lib/db";

export const HUE_OAUTH_URL = "https://api.meethue.com/v2/oauth2";
export const HUE_API_URL = "https://api.meethue.com/route/api";

const HUE_CLIENT_ID = process.env.HUE_CLIENT_ID!;
const HUE_CLIENT_SECRET = process.env.HUE_CLIENT_SECRET!;

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
  // Add redirect_uri if configured
  if (process.env.HUE_REDIRECT_URI) {
    params.set("redirect_uri", process.env.HUE_REDIRECT_URI);
  }
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

  // Refresh the token - if refresh fails, return null to trigger reconnect
  try {
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
  } catch {
    // Token refresh failed - user needs to reconnect
    return null;
  }
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

// Internal Hue API response types
interface HueGroupResponse {
  name: string;
  type: string;
  state?: {
    any_on?: boolean;
  };
  action?: {
    bri?: number;
  };
}

interface HueSceneResponse {
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

  const data: Record<string, HueGroupResponse> = await response.json();
  const rooms: HueRoom[] = [];

  for (const [id, group] of Object.entries(data)) {
    if (group.type === "Room" || group.type === "Zone") {
      rooms.push({
        id,
        name: group.name,
        type: group.type,
        on: group.state?.any_on || false,
        brightness: Math.round((group.action?.bri || 0) / 254 * 100),
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
  const body: Record<string, boolean | number> = {};

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

  const data: Record<string, HueSceneResponse> = await response.json();
  const scenes: HueScene[] = [];

  for (const [id, scene] of Object.entries(data)) {
    scenes.push({
      id,
      name: scene.name,
      group: scene.group,
      type: scene.type,
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
