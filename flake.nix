{
  description = "Ngeringukno - a desktop audio player (Electron)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      mkNgeringukno = pkgs:
        pkgs.buildNpmPackage rec {
          pname = "ngeringukno";
          version = "0.7.0";
          src = self;

          npmDepsHash = "sha256-Z8JgaVaIR6YCmcYDrhdtAkTThslEEmOdRD+cEn6S0u4=";

          ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
          forceGitDeps = true;
          npmInstallFlags = [ "--omit=dev" ];

          buildPhase = "true";

          installPhase =
            let
              appDir = "$out/share/ngeringukno";
              runtimeDeps = pkgs.lib.makeBinPath [ pkgs.yt-dlp pkgs.ffmpeg ];
              desktop = pkgs.makeDesktopItem {
                name = "Ngeringukno";
                desktopName = "Ngeringukno";
                genericName = "Audio Player";
                exec = "ngeringukno";
                icon = "ngeringukno";
                categories = [ "AudioVideo" "Audio" "Player" ];
                startupWMClass = "ngeringukno";
              };
            in
            ''
              runHook preInstall

              mkdir -p ${appDir}
              cp -r src assets package.json node_modules ${appDir}/

              mkdir -p $out/bin
              makeWrapper ${pkgs.electron}/bin/electron $out/bin/ngeringukno \
                --add-flags ${appDir}/package.json \
                --prefix PATH : ${runtimeDeps}

              mkdir -p $out/share/applications
              cp ${desktop}/share/applications/*.desktop $out/share/applications/

              mkdir -p $out/share/icons/hicolor/256x256/apps
              cp ${appDir}/assets/icon.png $out/share/icons/hicolor/256x256/apps/ngeringukno.png

              runHook postInstall
            '';

          meta = with pkgs.lib; {
            description = "Ngeringukno - audio player made for humans";
            homepage = "https://github.com/rafcnzo/ngeringukno";
            license = licenses.mit;
            mainProgram = "ngeringukno";
            platforms = platforms.linux ++ platforms.darwin;
          };
        };
    in
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages = {
          default = mkNgeringukno pkgs;
          ngeringukno = mkNgeringukno pkgs;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            python3
            yt-dlp
            ffmpeg
          ];

          shellHook = ''
            echo "Ngeringukno dev shell. Install deps and run with:"
            echo "  npm install && npm start"
          '';
        };
      })
    // {
      overlays.default = final: prev: {
        ngeringukno = mkNgeringukno final;
      };
    };
}
