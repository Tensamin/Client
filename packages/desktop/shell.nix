{pkgs ? import <nixpkgs> {}}: let
  libs = with pkgs; [
    nspr
    nss
    libxcb
    libxkbcommon
    wayland
    libdecor
    dbus
    atk
    glib
    gtk3
    cups
    libx11
    libxcomposite
    libxdamage
    libxext
    libxfixes
    libxrandr
    libgbm
    expat
    cairo
    pango
    alsa-lib

    webkitgtk_4_1
    libsoup_3
    libayatana-appindicator
    gdk-pixbuf
  ];
in
  pkgs.mkShell {
    buildInputs = [pkgs.bun] ++ libs;

    shellHook = ''
      export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libs}:$LD_LIBRARY_PATH
      export GDK_BACKEND=wayland
      export OZONE_PLATFORM=wayland
      export XDG_SESSION_TYPE=wayland
    '';
  }
