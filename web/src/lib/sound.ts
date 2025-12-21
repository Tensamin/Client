export const playSound = (name: string) => {
  const path = `/assets/sounds/${name}.wav`;
  const audio = new Audio(path);
  audio.volume = 0.5;
  audio.play().catch(() => {});
};
