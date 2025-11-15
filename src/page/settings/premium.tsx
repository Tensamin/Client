"use client";

// Package Imports
import { useEffect, useState } from "react";

// Context Imports
import { useUserContext } from "@/context/user";

// Main
export default function Page() {
  const { get, ownUuid } = useUserContext();
  const [premiumInfo, setPremiumInfo] = useState<{
    level: string;
    expiresInDays: number;
  }>({ level: "", expiresInDays: 0 });

  useEffect(() => {
    get(ownUuid, false).then((data) => {
      let level;
      switch (data.sub_level) {
        case 0:
          level = "Free";
          break;
        case 1:
          level = "Premium";
          break;
        default:
          level = "Error";
      }
      setPremiumInfo({
        level,
        expiresInDays: data.sub_end,
      });
    });
  });

  return (
    <div className="flex flex-col">
      <p>Status: {premiumInfo.level}</p>
      {premiumInfo.level !== "Free" && (
        <p>Remaining Days: {premiumInfo.expiresInDays}</p>
      )}
    </div>
  );
}
