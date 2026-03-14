import * as React from "react";

export default function Avatar(props: { img?: string; fallback: string }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <div className="m-0 bg-card rounded-full border border-input/75 size-9 aspect-square flex items-center justify-center select-none overflow-hidden">
      {props.img && !imageFailed ? (
        <img
          className="rounded-full w-full h-full object-cover"
          src={props.img}
          alt={props.fallback}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{props.fallback}</span>
      )}
    </div>
  );
}
