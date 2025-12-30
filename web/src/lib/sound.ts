export const playSound = (name: string) => {
  if (typeof document === 'undefined') return;

  const audio = document.createElement('audio') as HTMLAudioElement;
  audio.src = `/assets/sounds/${name}.wav`;
  audio.autoplay = true;
  audio.preload = 'auto';
  audio.style.display = 'none';
  audio.setAttribute('playsinline', '');
  audio.addEventListener('ended', () => audio.remove());

  document.body.appendChild(audio);
  audio.play().catch(() => {});
};
