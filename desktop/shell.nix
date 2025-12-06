{
  pkgs ? import <nixpkgs> { },
}:

(pkgs.buildFHSEnv {
  name = "electron-dev-env";
  targetPkgs =
    pkgs: with pkgs; [
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
      mesa
      expat
      libxkbcommon
      libxkbfile
      wayland
      systemd
      alsa-lib
      at-spi2-core
      gcc
      vips
      musl
      libGL
      libdrm
      pipewire
      xorg.libX11
      xorg.libXcomposite
      xorg.libXcursor
      xorg.libXdamage
      xorg.libXext
      xorg.libXfixes
      xorg.libXi
      xorg.libXrandr
      xorg.libXrender
      xorg.libXScrnSaver
      xorg.libXtst
      xorg.libxcb
    ];
  runScript = "bun run dev";
}).env
