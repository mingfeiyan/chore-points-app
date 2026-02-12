/**
 * Client-side Hue bridge control for local network effects
 * This allows direct communication with the Hue bridge from the browser
 * when on the same network.
 */

// Local bridge configuration
// These can be overridden via localStorage for different setups
const DEFAULT_BRIDGE_IP = "192.168.86.240";
const DEFAULT_USERNAME = "1cC8AHppFgU4p77qw2rK8YAK-XWoHD6hx-02rBLx";

// Hue color values (0-65535)
const HUE_BLUE = 46920;
const HUE_RED = 0;
const HUE_GREEN = 25500;
const HUE_YELLOW = 12750;

interface HueBridgeConfig {
  bridgeIp: string;
  username: string;
}

function getConfig(): HueBridgeConfig {
  if (typeof window === "undefined") {
    return { bridgeIp: DEFAULT_BRIDGE_IP, username: DEFAULT_USERNAME };
  }
  
  return {
    bridgeIp: localStorage.getItem("hue_bridge_ip") || DEFAULT_BRIDGE_IP,
    username: localStorage.getItem("hue_username") || DEFAULT_USERNAME,
  };
}

function getBridgeUrl(): string {
  const config = getConfig();
  return `http://${config.bridgeIp}/api/${config.username}`;
}

interface LightState {
  on: boolean;
  bri?: number;
  hue?: number;
  sat?: number;
  xy?: [number, number];
  ct?: number;
  alert?: "none" | "select" | "lselect";
  effect?: "none" | "colorloop";
  transitiontime?: number;
}

interface GroupState {
  any_on?: boolean;
  all_on?: boolean;
}

interface GroupAction {
  on?: boolean;
  bri?: number;
  hue?: number;
  sat?: number;
}

interface GroupInfo {
  name: string;
  lights: string[];
  state: GroupState;
  action: GroupAction;
}

/**
 * Get the current state of a group/room
 */
export async function getGroupState(groupId: string): Promise<GroupInfo | null> {
  try {
    const response = await fetch(`${getBridgeUrl()}/groups/${groupId}`, {
      method: "GET",
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch {
    console.warn("Failed to get Hue group state - bridge may be unreachable");
    return null;
  }
}

/**
 * Set the state of a group/room
 */
export async function setGroupState(
  groupId: string,
  state: Partial<LightState>
): Promise<boolean> {
  try {
    const response = await fetch(`${getBridgeUrl()}/groups/${groupId}/action`, {
      method: "PUT",
      body: JSON.stringify(state),
    });
    
    return response.ok;
  } catch {
    console.warn("Failed to set Hue group state - bridge may be unreachable");
    return false;
  }
}

/**
 * Flash lights in a specific color multiple times
 * @param groupId - The Hue group/room ID (e.g., "2" for living room)
 * @param color - The hue value (0-65535) or a preset color name
 * @param times - Number of flashes
 * @param intervalMs - Milliseconds between flashes
 */
export async function flashLights(
  groupId: string,
  color: number | "blue" | "red" | "green" | "yellow" = "blue",
  times: number = 3,
  intervalMs: number = 600
): Promise<void> {
  // Convert color name to hue value
  const hueValue = typeof color === "string" 
    ? { blue: HUE_BLUE, red: HUE_RED, green: HUE_GREEN, yellow: HUE_YELLOW }[color] ?? HUE_BLUE
    : color;

  // Get current state to restore later
  const currentState = await getGroupState(groupId);
  if (!currentState) {
    console.warn("Could not get current Hue state, skipping flash effect");
    return;
  }

  const wasOn = currentState.state?.any_on ?? false;
  const originalBri = currentState.action?.bri ?? 254;
  const originalHue = currentState.action?.hue;
  const originalSat = currentState.action?.sat;

  // Flash the lights
  for (let i = 0; i < times; i++) {
    // Turn on with color
    await setGroupState(groupId, {
      on: true,
      hue: hueValue,
      sat: 254,
      bri: 254,
      transitiontime: 0, // Instant
    });
    
    await sleep(intervalMs / 2);
    
    // Turn off (or dim)
    await setGroupState(groupId, {
      on: false,
      transitiontime: 0,
    });
    
    await sleep(intervalMs / 2);
  }

  // Restore original state
  if (wasOn) {
    const restoreState: Partial<LightState> = {
      on: true,
      bri: originalBri,
      transitiontime: 5, // Smooth transition back
    };
    if (originalHue !== undefined) restoreState.hue = originalHue;
    if (originalSat !== undefined) restoreState.sat = originalSat;
    await setGroupState(groupId, restoreState);
  } else {
    await setGroupState(groupId, { on: false });
  }
}

/**
 * Check if the Hue bridge is reachable
 */
export async function isBridgeReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${getBridgeUrl()}/config`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Configure the local Hue bridge settings
 */
export function configureBridge(bridgeIp: string, username: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("hue_bridge_ip", bridgeIp);
    localStorage.setItem("hue_username", username);
  }
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Room IDs for convenience
export const HUE_ROOMS = {
  BEDROOM: "1",
  LIVING_ROOM: "2",
  GUEST_ROOM: "3",
} as const;

// Local celebration server (bypasses HTTPS→HTTP restriction)
// Uses the Mac's local IP so it works from any device on the network
const CELEBRATION_SERVER_IP = "http://192.168.86.226:3001";
const CELEBRATION_SERVER_LOCALHOST = "http://localhost:3001";

/**
 * Try to trigger celebration via local server first, fall back to direct bridge
 * Tries both the network IP (for phones/tablets) and localhost (for Mac browser)
 */
async function triggerCelebration(
  endpoint: string,
  fallback: () => Promise<void>
): Promise<void> {
  // Try network IP first (works from any device on the network)
  try {
    const response = await fetch(`${CELEBRATION_SERVER_IP}${endpoint}`, {
      method: "POST",
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) return;
  } catch {
    // Network IP failed, try localhost
  }
  
  // Try localhost (works when viewing on the Mac itself)
  try {
    const response = await fetch(`${CELEBRATION_SERVER_LOCALHOST}${endpoint}`, {
      method: "POST",
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) return;
  } catch {
    // Server not running, try direct bridge (works on localhost dev)
  }
  
  return fallback();
}

// Preset celebration effects
export const celebrationEffects = {
  /**
   * Flash bedroom blue 3 times - for points celebration
   */
  pointsCelebration: () => triggerCelebration(
    "/celebrate/points",
    () => flashLights(HUE_ROOMS.BEDROOM, "blue", 3, 600)
  ),
  
  /**
   * Flash bedroom green 3 times - for achievement unlocked
   */
  achievementUnlocked: () => triggerCelebration(
    "/celebrate/achievement",
    () => flashLights(HUE_ROOMS.BEDROOM, "green", 3, 500)
  ),
  
  /**
   * Flash bedroom yellow 5 times - for milestone reached
   */
  milestoneReached: () => triggerCelebration(
    "/celebrate/milestone",
    () => flashLights(HUE_ROOMS.BEDROOM, "yellow", 5, 400)
  ),
};
