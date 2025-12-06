"use client";

// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Main
export default function Page() {
  const { get, ownId } = useUserContext();
  const [premiumInfo, setPremiumInfo] = useState<{
    level: string;
    expiresInDays: number;
  }>({ level: "SETTINGS_PREMIUM_LEVEL_FREE", expiresInDays: 0 });

  useEffect(() => {
    let cancelled = false;
    get(ownId, false).then((data) => {
      if (cancelled) return;
      let levelKey = "SETTINGS_PREMIUM_LEVEL_ERROR";
      switch (data.sub_level) {
        case 0:
          levelKey = "SETTINGS_PREMIUM_LEVEL_FREE";
          break;
        case 1:
          levelKey = "SETTINGS_PREMIUM_LEVEL_PREMIUM";
          break;
        default:
          levelKey = "SETTINGS_PREMIUM_LEVEL_ERROR";
      }
      setPremiumInfo({
        level: levelKey,
        expiresInDays: data.sub_end,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [get, ownId]);

  return (
    <div className="flex flex-col">
      <p>Status: {premiumInfo.level}</p>
      {premiumInfo.level !== "SETTINGS_PREMIUM_LEVEL_FREE" && (
        <p>Days remaining: {premiumInfo.expiresInDays}</p>
      )}
    </div>
  );
}
