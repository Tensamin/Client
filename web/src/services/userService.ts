/**
 * User service
 * Handles fetching and caching user data
 */

import { user as userEndpoint } from "@/config/endpoints";
import type { User } from "@/lib/types";
import { getDisplayFromUsername } from "@/lib/utils";

export type FetchedUserData = Omit<User, "state" | "loading">;

/**
 * Fetch user data from the API
 */
export async function fetchUserData(
  userId: number,
): Promise<FetchedUserData | null> {
  try {
    if (!userId || userId === 0) {
      throw new Error("Invalid user ID");
    }

    const response = await fetch(`${userEndpoint}${userId}`);
    const data = await response.json();

    if (data.type !== "success") {
      throw new Error(`API error: ${data.message || "Unknown error"}`);
    }

    return {
      id: userId,
      username: data.data.username,
      display: getDisplayFromUsername(data.data.username, data.data.display),
      avatar: data.data.avatar,
      about: data.data.about,
      status: data.data.status,
      sub_level: data.data.sub_level,
      sub_end: data.data.sub_end,
      public_key: data.data.public_key,
    };
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
}
