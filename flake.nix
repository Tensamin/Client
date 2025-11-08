{
  description = "Tensamin Desktop Apps";

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
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
    in
    flake-utils.lib.eachSystem systems (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        lib = pkgs.lib;
        debArch =
          if system == "x86_64-linux" then
            "amd64"
          else if system == "aarch64-linux" then
            "arm64"
          else
            throw "Unsupported system ${system}";

        tensaminPackage = pkgs.stdenvNoCC.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.3";

          src = pkgs.fetchurl {
            url = "https://github.com/Tensamin/Frontend/releases/download/v${version}/${pname}_${version}_${debArch}_linux.deb";
            hash = "sha256-9K1DfOEZ2Jo1Meo1pnKZEzh/OsHVItZBoFneNYDcNDo=";
          };

          nativeBuildInputs = [
            pkgs.dpkg
            pkgs.autoPatchelfHook
          ];

          buildInputs = with pkgs; [
            webkitgtk_4_1
            gtk3
            glib
            gdk-pixbuf
            cairo
            dbus
            librsvg
          ];

          dontUnpack = true;

          installPhase = ''
            runHook preInstall

            mkdir -p "$out"
            dpkg -x "$src" "$out"

            if [ -d "$out/usr/bin" ]; then
              mkdir -p "$out/bin"
              for file in "$out/usr/bin"/*; do
                ln -s "$file" "$out/bin/$(basename "$file")"
              done
            fi

            runHook postInstall
          '';

          meta = with lib; {
            description = "Tensamin Desktop Apps";
            homepage = "https://tensamin.net";
            platforms = [ system ];
            mainProgram = "tensamin";
          };
        };
      in
      {
        legacyPackages = pkgs;

        packages = {
          default = tensaminPackage;
        };

        apps.default = flake-utils.lib.mkApp { drv = tensaminPackage; };
      }
    );
}
