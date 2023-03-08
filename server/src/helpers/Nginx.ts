import cp from "child_process";
import fs from "fs/promises";
import Site from "../models/Site";
import SiteConfig, { ISiteConfig } from "../models/SiteConfig";

namespace Nginx {
  export let wwwPath = "/var/www/vhosts";
  export let nginxConfigPath = "/etc/nginx";
  export const getSitesAvailablePath = () => `${nginxConfigPath}/sites-available`;
  export const getSitesEnabledPath = () => `${nginxConfigPath}/sites-enabled`;
  export const getSiteConfigurationsPath = () => `${nginxConfigPath}/.site-configurations`;

  export async function ensureDir(path: string | Promise<string>): Promise<string> {
    const _path = await path;
    const exists = await fs.stat(_path).then(() => true).catch(() => false);

    if (!exists) {
      await fs.mkdir(_path, { recursive: true });
    }

    return _path;
  }

  export async function exec(command: string): Promise<number> {
    const p = cp.exec(command);

    p.stdout.on("data", (data) => {
      console.log(data);
    });

    p.stderr.on("data", (data) => {
      console.error(data);
    });

    return new Promise((resolve, reject) => {
      p.on("close", (code) => {
        if (code === 0) {
          resolve(0);
        }
        else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });
    });
  }

  export async function listAvailableSiteNames() {
    return fs.readdir(getSitesAvailablePath());
  }

  export async function listEnabledSiteNames() {
    return fs.readdir(getSitesEnabledPath());
  }

  export async function listSiteConfigurations() {
    const path = getSiteConfigurationsPath();
    const enabled = await listEnabledSiteNames();
    return ensureDir(path)
      .then(() => fs.readdir(path))
      .then(files => Promise.all(
        files.map(async f => {
          try {
            const config = JSON.parse(
              await fs.readFile(`${path}/${f}`, "utf-8")
            ) as ISiteConfig;

            return new SiteConfig(
              new Site(f, enabled.includes(f)),
              config
            );
          } catch (error) {
            throw new Error(`Failed to parse ${f}`);
          }
        })
      ));
  }

  export async function listSites(): Promise<Site[]> {
    const available = await listAvailableSiteNames();
    const enabled = await listEnabledSiteNames();
    const sites: Site[] = available.map(
      n => new Site(n, enabled.includes(n))
    );

    return sites;
  }

  export async function reload(): Promise<void> {
    await exec("systemctl reload nginx");
  }

  export async function restart(): Promise<void> {
    await exec("systemctl restart nginx");
  }

  export async function start(): Promise<void> {
    await exec("systemctl start nginx");
  }

  export async function stop(): Promise<void> {
    await exec("systemctl stop nginx");
  }

  export async function generateConfigs(): Promise<void> {
    const configs = await listSiteConfigurations();
    // const enabled = await listEnabledSiteNames();

    const configStrings = configs.map(c => c.generateConfig());

    for (let i = 0; i < configStrings.length; i++) {
      const config = configStrings[i];
      const site = configs[i].site;
      const availablePath = `${getSitesAvailablePath()}/${site.name}`;
      const enabledPath = `${getSitesEnabledPath()}/${site.name}`;

      await fs.writeFile(availablePath, config);
      if (site.enabled) {
        if (await fs.stat(enabledPath).catch(() => false)) {
          await fs.symlink(availablePath, enabledPath);
        }
      }
      else {
        if (await fs.stat(enabledPath).then(() => true).catch(() => false)) {
          await fs.unlink(enabledPath);
        }
      }
    }
  }
}

export default Nginx;