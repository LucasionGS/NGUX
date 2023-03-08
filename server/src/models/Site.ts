import Nginx from "../helpers/Nginx";
import fs from "fs/promises";

export default class Site {
  constructor(
    public name: string,
    public enabled: boolean
  ) { }

  public get path(): string {
    return `${Nginx.getSitesAvailablePath()}/${this.name}`;	
  }

  private get enabledPath(): string {
    return `${Nginx.getSitesAvailablePath()}/${this.name}`;	
  }

  public async enable(): Promise<void> {
    const exists = await fs.stat(this.path).then(() => true).catch(() => false);

    if (!exists) {
      throw new Error(`Site ${this.name} does not exist`);
    }
    
    await fs.symlink(
      this.path,
      this.enabledPath
    );
    this.enabled = true;
  }

  public async disable(): Promise<void> {
    const exists = await fs.stat(this.enabledPath).then(() => true).catch(() => false);

    if (!exists) {
      throw new Error(`Site ${this.name} is not enabled`);
    }

    await fs.unlink(this.enabledPath);
    this.enabled = false;
  }

  public static async create(name: string): Promise<Site> {
    const exists = await fs.stat(`${Nginx.getSitesAvailablePath()}/${name}`).then(() => true).catch(() => false);

    if (exists) {
      throw new Error(`Site ${name} already exists`);
    }

    await fs.writeFile(`${Nginx.getSitesAvailablePath()}/${name}`, "");
    return new Site(name, false);
  }

  public get errorLogPath() {
    return `/var/www/log/${this.name}/error_log`;
  }
  public get accessLogPath() {
    return `/var/www/log/${this.name}/access_log`;
  }
}