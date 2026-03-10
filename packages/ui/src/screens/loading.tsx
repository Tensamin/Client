import { createSignal, createEffect, on } from "solid-js";

const DELAY = 250;

export default function Screen(props: { progress: number }) {
  const [displayProgress, setDisplayProgress] = createSignal(0);

  // Animation
  createEffect(
    on(
      () => props.progress,
      (target) => {
        const start = displayProgress();
        const delta = target - start;
        if (delta === 0) return;

        const duration = DELAY;
        const startTime = performance.now();

        function animate(now: number) {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplayProgress(start + delta * eased);
          if (t < 1) requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
      },
    ),
  );

  return (
    <div class="bg-background w-full h-screen flex flex-col justify-center items-center">
      <div class="w-64 h-1.5 bg-secondary rounded-full overflow-hidden relative">
        <div
          class="h-full bg-primary absolute left-0 top-0"
          style={{
            width: `${displayProgress()}%`,
          }}
        />
      </div>
    </div>
  );
}
