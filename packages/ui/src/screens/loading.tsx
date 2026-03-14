import * as React from "react";

const DELAY = 250;

export default function Screen(props: { progress: number }) {
  const [displayProgress, setDisplayProgress] = React.useState(0);
  const displayProgressRef = React.useRef(0);

  React.useEffect(() => {
    displayProgressRef.current = displayProgress;
  }, [displayProgress]);

  React.useEffect(() => {
    const target = props.progress;
    const start = displayProgressRef.current;
    const delta = target - start;

    if (delta === 0) {
      return;
    }

    const duration = DELAY;
    const startTime = performance.now();
    let frameId = 0;

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayProgress(start + delta * eased);

      if (t < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [props.progress]);

  return (
    <div className="bg-background w-full h-screen flex flex-col justify-center items-center">
      <div className="w-64 h-1.5 bg-secondary rounded-full overflow-hidden relative">
        <div
          className="h-full bg-primary absolute left-0 top-0"
          style={{
            width: `${displayProgress}%`,
          }}
        />
      </div>
    </div>
  );
}
