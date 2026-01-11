import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { authRateLimiter, checkRateLimit } from "@/lib/rate-limit";

// Wrap POST handler with rate limiting for login attempts
async function rateLimitedPost(req: NextRequest) {
  // Only rate limit credential sign-in attempts, not OAuth callbacks
  if (req.nextUrl.pathname.includes("/callback/credentials")) {
    const rateLimitResponse = checkRateLimit(req, authRateLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  return handlers.POST(req);
}

export const GET = handlers.GET;
export const POST = rateLimitedPost;
