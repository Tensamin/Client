{
  pkgs ? import <nixpkgs> { },
}:

(pkgs.buildFHSEnv {
  name = "tensamin-mobile-dev";
  targetPkgs =
    pkgs: with pkgs; [
      swift
      usbmuxd
      (appimageTools.wrapType2 {
        name = "xtool";
        version = "v1.16.1";
        pname = "xtool";
        src = fetchurl {
          url = "https://github.com/xtool-org/xtool/releases/latest/download/xtool-x86_64.AppImage";
          sha256 = "sha256-VqrJE3KYDSw3/eslzbfm+C2V3qQ51aama5dNpIBNLQk=";
        };
      })
    ];
  runScript = "zsh";
}).env
