{
  pkgs ? import <nixpkgs> { },
}:

(pkgs.buildFHSEnv {
  name = "electron-dev-env";
  targetPkgs =
    pkgs:
    with pkgs; [
      nodejs
      ffmpeg-full
      glib
      libgbm
      nss
      nspr
      dbus
      atk
      at-spi2-atk
      cups
      cairo
      gtk3
      pango
      xorg.libX11
      xorg.libXcomposite
      xorg.libXdamage
      xorg.libXext
      xorg.libXfixes
      xorg.libXrandr
      xorg.libxcb
      xorg.libXcursor
      mesa
      expat
      libxkbcommon
      systemd
      alsa-lib
      at-spi2-core
      gcc
      vips
      musl
      libGL
    ];
  runScript = "bun run dev";
}).env