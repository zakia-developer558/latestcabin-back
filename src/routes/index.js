import express from "express";
import userRoutes from "./userRoutes.js";
import cabinRoutes from "./cabinRoutes.js";

const router = express.Router();
router.use("/auth", userRoutes);
router.use("/cabins", cabinRoutes);


export default router;  

