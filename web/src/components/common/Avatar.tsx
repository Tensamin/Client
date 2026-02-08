/**
 * Avatar component
 * Displays user avatars with loading states and status indicators
 * 
 * Moved from components/modals/Avatar.tsx to components/common/
 */

import * as AvatarComponent from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";

import {
  cn,
  convertStringToInitials,
  formatRawMessage,
  getColorFor,
} from "@/lib/utils";

export interface AvatarProps {
  size: number;
  display: string;
  image: string | null | undefined;
  addBorder?: boolean;
  className?: string;
  loading: boolean;
  state?: string;
}

export default function Avatar({
  size,
  display,
  image,
  addBorder,
  className,
  loading,
  state,
}: AvatarProps) {
  const px = size * 2.4;
  const stateIcon = size > 40 ? size / 2 : size / 1.7;
  const fontSize = size;

  return loading ? (
    <Skeleton
      style={{
        width: px,
        height: px,
      }}
      className={cn(
        "aspect-square select-none rounded-full",
        addBorder && "border border-muted",
        className,
      )}
    />
  ) : (
    <div
      style={{
        width: px,
        height: px,
      }}
      className={cn(
        "relative aspect-square select-none rounded-full",
        addBorder && "border border-muted",
        className,
      )}
    >
      <AvatarComponent.Avatar
        className={cn(
          !addBorder && "bg-transparent",
          "object-cover w-full h-full",
        )}
        key={image}
      >
        {image && <Image width={px} height={px} src={image} alt={display} />}
        <AvatarComponent.AvatarFallback
          style={{
            fontSize,
          }}
        >
          {convertStringToInitials(display)}
        </AvatarComponent.AvatarFallback>
      </AvatarComponent.Avatar>

      {state && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              style={{
                width: stateIcon * 1.5,
                height: stateIcon * 1.5,
                bottom: -stateIcon / 5,
                right: -stateIcon / 5,
              }}
              className={
                "rounded-full absolute bg-muted flex justify-center items-center"
              }
            >
              <div
                style={{
                  width: stateIcon,
                  height: stateIcon,
                }}
                className={cn("rounded-full border", getColorFor(state))}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatRawMessage(state)}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
