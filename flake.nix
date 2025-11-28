{
  description = "Tensamin Desktop App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachSystem [ "x86_64-linux" ] (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.10"; # nix-update will manage this

          src = pkgs.fetchurl {
            url = "https://github.com/Tensamin/Frontend/releases/download/v${version}/tensamin_${version}_amd64.deb";
            hash = "sha256-jJAHO0eHuWNb142yiA1gL0u9cTBMZ/j9ChTNVHJS3U4="; # nix-update will manage this
          };

          nativeBuildInputs = with pkgs; [
            dpkg
            autoPatchelfHook
            makeWrapper
          ];

          buildInputs = with pkgs; [
            alsa-lib
            at-spi2-atk
            at-spi2-core
            cairo
            cups
            dbus
            expat
            glib
            gtk3
            libappindicator-gtk3
            libGL
            libdrm
            libxkbcommon
            mesa
            nspr
            nss
            pango
            systemd
            xorg.libX11
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            xorg.libXrandr
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
            description = "True E2EE, decentralized messages. Open source and privacy first.";
            homepage = "https://github.com/Tensamin/Frontend";
            license = licenses.unfree;
            platforms = [ "x86_64-linux" ];
            mainProgram = pname;
          };
        };
      }
    );
}
