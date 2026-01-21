{
  description = "Tensamin Desktop App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    fenix.url = "github:nix-community/fenix";
    fenix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    fenix,
  }:
    flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };

        archMapping = {
          x86_64-linux = {
            debArch = "amd64";
            hash = "sha256-PoSw8eQcCYVOcILRFKJKat4hGMQzXUzSVTAp+3i35S0=";
          };
          aarch64-linux = {
            debArch = "arm64";
            hash = "sha256-JniO7qWIffs37M9U8nTTRy7L6z/m1f45NwBYU3x3m7w=";
          };
        };

        archConfig = archMapping.${system};

        android_sdk =
          (pkgs.androidenv.composeAndroidPackages {
            platformVersions = ["34" "35" "36"];
            buildToolsVersions = ["34.0.0" "35.0.0"];
            ndkVersions = ["26.3.11579264"];
            includeNDK = true;
            useGoogleAPIs = false;
            useGoogleTVAddOns = false;
            includeEmulator = false;
            includeSystemImages = false;
            includeSources = true;
            extraLicenses = ["android-sdk-license"];
          })
        .androidsdk;

        packages = with pkgs; [
          curl
          wget
          pkg-config

          nodejs_24
          typescript-language-server

          (with fenix.packages.${system};
            combine [
              complete.rustc
              complete.cargo
              complete.clippy
              targets.aarch64-linux-android.latest.rust-std
              targets.armv7-linux-androideabi.latest.rust-std
              targets.i686-linux-android.latest.rust-std
              targets.x86_64-linux-android.latest.rust-std
            ])
          rust-analyzer

          android-studio
          android_sdk
          jdk
          gradle
        ];

        libraries = with pkgs; [
          gtk3
          libsoup_3
          webkitgtk_4_1
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl
          librsvg
        ];
      in {
        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "tensamin";
          version = "0.1.41";

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

        devShell = pkgs.mkShell {
          buildInputs = packages ++ libraries;

          LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH";
          XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS";
          ANDROID_HOME = "${android_sdk}/libexec/android-sdk";
          NDK_HOME = "${android_sdk}/libexec/android-sdk/ndk/26.3.11579264";
          GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${android_sdk}/libexec/android-sdk/build-tools/35.0.0/aapt2";

          shellHook = ''
            export GRADLE_USER_HOME="$HOME/.gradle"
            adb start-server
          '';
        };
      }
    );
}
