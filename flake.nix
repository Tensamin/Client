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

        tensaminPackage = pkgs.stdenv.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.3";

          src = self;
          strictDeps = true;

          nativeBuildInputs = with pkgs; [
            bun
            cargo
            rustc
            pkg-config
            python3
            cmake
          ];

          buildInputs = with pkgs; [
            openssl
            glib
            atk
            cairo
            gdk-pixbuf
            gtk3
            pango
            libayatana-appindicator
            librsvg
            libsoup_3
            webkitgtk_4_1
            alsa-lib
            xorg.libX11
            xorg.libXi
            xorg.libXtst
          ];

          dontConfigure = true;

          BUN_INSTALL_CACHE_DIR = "$TMPDIR/bun-cache";
          BUN_INSTALL_GLOBAL_BIN_DIR = "$TMPDIR/bun-bin";
          CARGO_HOME = "$TMPDIR/cargo-home";
          RUSTUP_HOME = "$TMPDIR/rustup-home";
          npm_config_cache = "$TMPDIR/npm-cache";

          buildPhase = ''
            runHook preBuild

            export HOME=$TMPDIR/home
            mkdir -p "$HOME"

            bun install --frozen-lockfile
            bun run build:tauri

            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p "$out"
            cp -r "tauri/target/release/bundle/deb/${pname}_${version}_${debArch}/usr/." "$out/"

            runHook postInstall
          '';

          fixupPhase = ''
            runHook preFixup

            if [ -d "$out/usr/bin" ]; then
              mkdir -p "$out/bin"
              for file in "$out/usr/bin"/*; do
                ln -s "$file" "$out/bin/$(basename "$file")"
              done
            fi

            runHook postFixup
          '';

          meta = with lib; {
            description = "Tensamin Desktop Apps";
            homepage = "https://tensamin.net";
            license = licenses.unfree;
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
