{
  nixConfig = {
    extra-substituters = ["https://nix-community.cachix.org"];
    extra-trusted-public-keys = ["nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="];
  };

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    git-hooks.url = "github:cachix/git-hooks.nix";
    git-hooks.inputs.nixpkgs.follows = "nixpkgs";
    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = {
    self,
    nixpkgs,
    git-hooks,
    bun2nix,
  }: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = f:
      nixpkgs.lib.genAttrs systems (system:
        f system (import nixpkgs {
          inherit system;
          overlays = [bun2nix.overlays.default];
        }));
  in {
    checks = forAllSystems (system: pkgs: {
      pre-commit = git-hooks.lib.${system}.run {
        src = ./.;
        hooks = {
          alejandra.enable = true;
          biome.enable = true;

          nix-build = {
            enable = true;
            name = "nix-build";
            entry = pkgs.lib.getExe (pkgs.writeShellApplication {
              name = "nix-build-check";
              runtimeInputs = [pkgs.nix];
              text = "nix build --no-link";
            });
            stages = ["pre-push"];
            pass_filenames = false;
            files = "(package\\.json|bun\\.lock|bun\\.nix|flake\\.nix)";
          };
        };
      };
    });

    packages = forAllSystems (system: pkgs: {
      default = pkgs.bun2nix.writeBunApplication {
        packageJson = ./package.json;
        src = ./.;
        dontUseBunBuild = true;
        startScript = "bun src/index.ts";
        bunDeps = pkgs.bun2nix.fetchBunDeps {
          bunNix = ./bun.nix;
        };
      };
    });

    devShells = forAllSystems (system: pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          bun2nix.packages.${system}.default

          (writeShellScriptBin "run" ''
            bun run dev
          '')
        ];
        shellHook = self.checks.${system}.pre-commit.shellHook;
      };
    });
  };
}
