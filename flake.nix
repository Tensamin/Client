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
        #pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.4"; # nix-update will manage this

          src = pkgs.fetchurl {
            url = "https://github.com/Tensamin/Frontend/releases/download/desktop-v${version}/tensamin_${version}_amd64.deb";
            hash = "sha256-3idiW11cFL/X885kB+zzL8mgDw4L25lYlXLOG69POoM="; # nix-update will manage this
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
            dpkg-deb -x $src .
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin $out/share/${pname} $out/share/applications $out/share/icons

            cp -r usr/share/* $out/share/
            cp -r usr/lib/${pname}/* $out/share/${pname}/

            makeWrapper $out/share/${pname}/${pname} $out/bin/${pname} \
              --prefix LD_LIBRARY_PATH : ${pkgs.lib.makeLibraryPath buildInputs} \
              --add-flags "--no-sandbox" # Optional: Electron often needs this in Nix

            substituteInPlace $out/share/applications/${pname}.desktop \
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
