# Ngeringukno on Nix

The `flake.nix` exposes three things:

- `packages.ngeringukno` (also `packages.default`) — the installable app
- `overlays.default` — an overlay for nixpkgs
- `devShells.default` — a shell for hacking on Ngeringukno

## Install into your system config (Flakes)

Add the input:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    ngeringukno.url = "github:rafcnzo/ngeringukno";
  };

  outputs = { self, nixpkgs, ngeringukno, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [ ngeringukno.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

For home-manager, inside your home config:

```nix
{
  inputs.ngeringukno.url = "github:rafcnzo/ngeringukno";

  outputs = { nixpkgs, home-manager, ngeringukno, ... }: {
    homeConfigurations.you = home-manager.lib.homeManagerConfiguration {
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      modules = [
        ({ pkgs, ... }: {
          home.packages = [ ngeringukno.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

## Install via an overlay

Useful when you want `pkgs.ngeringukno` available everywhere rather than referencing `ngeringukno.packages...` directly:

```nix
{
  inputs.ngeringukno.url = "github:rafcnzo/ngeringukno";

  outputs = { nixpkgs, ngeringukno, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ ngeringukno.overlays.default ];
      };
    in {
      nixosConfigurations.myhost = pkgs.lib.nixosSystem {
        inherit system;
        modules = [{ environment.systemPackages = [ pkgs.ngeringukno ]; }];
      };
    };
}
```

## One-off / user installs (no config change)

```bash
# install into your profile
nix profile install github:rafcnzo/ngeringukno

# or just run it once
nix run github:rafcnzo/ngeringukno

# from a local checkout
nix profile install .
nix run .
```

After installing, `ngeringukno` is on your `PATH` and a `Ngeringukno` desktop entry + icon are registered.

## Development shell

```bash
git clone https://github.com/rafcnzo/ngeringukno
cd ngeringukno
nix develop          # nodejs, python3, yt-dlp, ffmpeg
npm install
npm start
```

## Notes

- The package wraps the nixpkgs `electron` with the app directory and puts `yt-dlp` and `ffmpeg` on `PATH`, so Ngeringukno finds them instead of self-downloading.
- `npmDepsHash` in `flake.nix` must be updated whenever `package.json`/`package-lock.json` change. Rebuild with a wrong/placeholder hash and copy the reported `got:` value, or regenerate it with `nix-prefetch-npm-deps` / `prefetch-npm-deps`.
