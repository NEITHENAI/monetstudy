{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [ pkgs.nodejs_20 ];
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = ["npm" "run" "dev" "--" "--port" "$PORT"];
        manager = "web";
      };
    };
  };
}
