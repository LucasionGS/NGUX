import { Router } from "express";
import Nginx from "../helpers/Nginx";

namespace NginxController {
  export const router = Router();
  
  router.get("/sites", async (req, res) => {
    const sites = Nginx.listSites();
    res.json(sites);
  });
}

export default NginxController;