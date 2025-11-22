{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.autoPatchelfHook
  ];

  buildInputs = [
    pkgs.ffmpeg-full
    pkgs.glib
    pkgs.nss
    pkgs.nspr
    pkgs.dbus
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.cairo
    pkgs.gtk3
    pkgs.pango
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.mesa
    pkgs.expat
    pkgs.xorg.libxcb
    pkgs.libxkbcommon
    pkgs.systemd
    pkgs.alsa-lib
    pkgs.at-spi2-core
    pkgs.gcc
    pkgs.vips
    pkgs.musl
  ];

  shellHook = ''
    for outDir in ./out/*; do
      [ -d "$outDir" ] || continue
      export autoPatchelfLibPath="$outDir:''${autoPatchelfLibPath:-}"
      autoPatchelf "$outDir"
    done
    exit 0
  '';
}
