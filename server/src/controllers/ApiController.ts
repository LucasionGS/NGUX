import { Router } from "express";
import NginxController from "./NginxController";

namespace ApiController {
  export const router = Router();
  
  router.get("/", (req, res) => {
    res.json({ message: "Hello from the API!"})
  });

  router.use("/nginx", NginxController.router);
}

export default ApiController;