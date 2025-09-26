import express from "express";
import userRoutes from "./userRoutes.js";
import cabinRoutes from "./cabinRoutes.js";
import legendRoutes from "./legendRoutes.js";

const router = express.Router();
router.use("/auth", userRoutes);
router.use("/cabins", cabinRoutes);
router.use("/legends", legendRoutes);


export default router;

