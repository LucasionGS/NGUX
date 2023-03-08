import Nginx from "../helpers/Nginx";
import Site from "./Site";
import fs from "fs";

export default class SiteConfig {
  constructor(
    public site: Site,
    public config: ISiteConfig
  ) {

  }

  public get path(): string {
    return `${Nginx.getSiteConfigurationsPath()}/${this.site.name}`;
  }

  public generateConfig(): string {
    const content = ["server {"];
    
    const config = this.config;
    config.listen ??= 80;
    config.server_name ??= this.site.name;
    config.root ??= `${Nginx.wwwPath}/${this.site.name}`;
    config.index ??= "index.html";

    // Push mandatory config
    content.push(`  listen ${config.listen};`);
    content.push(`  server_name ${config.server_name};`);
    content.push(`  root ${config.root};`);
    content.push(`  index ${config.index};`);
    content.push("");
    content.push("  location = /robots.txt  { access_log off; log_not_found off; }");
    content.push("");
    content.push(`  error_log ${this.site.errorLogPath} error;`);
    content.push(`  access_log ${this.site.accessLogPath};`);
    content.push("");
    content.push("  sendfile off;");
    content.push("");
    content.push("  fastcgi_intercept_errors on;");
    content.push("");
    if (config.auth_basic && config.auth_basic_user_file) {
      content.push(`  auth_basic "${config.auth_basic}";`);
      content.push(`  auth_basic_user_file ${config.auth_basic_user_file};`);
      content.push("");
    }
    if (config.proxy_pass_location && config.proxy_pass) {
      content.push(`  location ${config.proxy_pass_location} {`);
      content.push(`    proxy_pass ${config.proxy_pass};`);
      content.push("  }");
      content.push("");
    }

    if (config.php) {
      content.push("  location ~ \\.php$ {");
      content.push(`    fastcgi_pass ${config.php_fpm ?? `unix:/run/php/php${config.php_version ?? "7.4"}-fpm.sock`};`);
      content.push("    fastcgi_split_path_info ^((?U).+\.php)(/?.+)$;");
      content.push("    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;");
      content.push("    fastcgi_param PATH_INFO $fastcgi_path_info;");
      content.push("    fastcgi_param PATH_TRANSLATED $document_root$fastcgi_path_info;");
      content.push("    fastcgi_read_timeout 600s;");
      content.push("    fastcgi_send_timeout 600s;");
      content.push("    fastcgi_index index.php;");
      content.push("    include /etc/nginx/fastcgi_params;");
      content.push("  }");
      content.push("");
    }

    if (config.hideDotHt) {
      content.push("  location ~ /\.ht {");
      content.push("    deny all;");
      content.push("  }");
      content.push("");
    }


    content.push("}");
    return content.join("\n");
  }
}

export interface ISiteConfig {
  listen: number;
  server_name: string;
  root: string;
  index: string;

  // Special
  proxy_pass_location?: string;
  proxy_pass?: string;

  auth_basic?: string;
  auth_basic_user_file?: string;

  php?: boolean;
  php_version?: string;
  php_fpm?: string;

  hideDotHt?: boolean;
}