"use client";

// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Main
export default function Page() {
  const { get, ownUuid } = useUserContext();
  const { translate } = useStorageContext();
  const [premiumInfo, setPremiumInfo] = useState<{
    level: string;
    expiresInDays: number;
  }>({ level: "SETTINGS_PREMIUM_LEVEL_FREE", expiresInDays: 0 });

  useEffect(() => {
    let cancelled = false;
    get(ownUuid, false).then((data) => {
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
  }, [get, ownUuid]);

  return (
    <div className="flex flex-col">
      <p>
        {translate("SETTINGS_PREMIUM_STATUS_LABEL")}{" "}
        {translate(premiumInfo.level)}
      </p>
      {premiumInfo.level !== "SETTINGS_PREMIUM_LEVEL_FREE" && (
        <p>
          {translate(
            "SETTINGS_PREMIUM_REMAINING_DAYS",
            String(premiumInfo.expiresInDays)
          )}
        </p>
      )}
    </div>
  );
}
