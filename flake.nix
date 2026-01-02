{
  description = "Tensamin Desktop App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        
        archMapping = {
          x86_64-linux = {
            debArch = "amd64";
            hash = "sha256-ZZhRoNrG7fFEDNTQlV5pmIaLB+RouW3xu0VyR5kK8sg="; # nix-update will manage this
          };
          aarch64-linux = {
            debArch = "arm64";
            hash = "sha256-BCUahhy/0hGhJXbLGe816ASoGdeFtblni2dXnO0YLRo="; # nix-update will manage this
          };
        };
        
        archConfig = archMapping.${system};
      in {
        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.32"; # nix-update will manage this

          src = pkgs.fetchurl {
            url = "https://github.com/Tensamin/Client/releases/download/v${version}/tensamin_${version}_${archConfig.debArch}.deb";
            hash = archConfig.hash;
          };

          nativeBuildInputs = with pkgs; [
            dpkg
            autoPatchelfHook
            makeWrapper
          ];

          buildInputs = with pkgs; [
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

          unpackPhase = ''
            dpkg-deb --fsys-tarfile $src | tar -x --no-same-permissions --no-same-owner
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p $out
            cp -r usr/* $out

            WAYLAND_FLAGS="--ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime=true"

            wrapProgram $out/bin/${pname} \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath buildInputs}" \
              --add-flags "--no-sandbox --disable-updates --enable-features=UseOzonePlatform --ozone-platform=wayland" \
              --run 'if [[ -n "$NIXOS_OZONE_WL" ]] && [[ -n "$WAYLAND_DISPLAY" ]]; then export NIXOS_OZONE_WL_FLAGS="$\{WAYLAND_FLAGS}"; fi' \
              --add-flags "\$NIXOS_OZONE_WL_FLAGS"

            substituteInPlace $out/share/applications/${pname}.desktop \
              --replace "/opt/${pname}/${pname}" "$out/bin/${pname}" \
              --replace "/usr/bin/${pname}" "$out/bin/${pname}"

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Privacy-focused chat app";
            homepage = "https://tensamin.net/";
            license = licenses.unfree;
            platforms = ["x86_64-linux" "aarch64-linux"];
            mainProgram = pname;
          };
        };
      }
    );
}
