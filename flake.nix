{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-23.11";
    systems.url = "github:nix-systems/default";
  };

  outputs = { self, nixpkgs, systems }:
  let
    lib = nixpkgs.lib;
    eachSystem = lib.genAttrs (import systems);
    pkgsFor = eachSystem (system: nixpkgs.legacyPackages.${system});
  in {
    devShell = eachSystem (system: pkgsFor.${system}.mkShell {
      buildInputs = with pkgsFor.${system}; [
        nodejs_20
      ];
    });
  };
}
