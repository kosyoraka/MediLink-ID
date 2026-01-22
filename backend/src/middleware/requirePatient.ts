import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type PatientJwtPayload = {
  id: string;
  email?: string;
  role?: "patient";
  iat?: number;
  exp?: number;
};

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing env var: JWT_SECRET");
  return s;
}

export function requirePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [kind, token] = header.split(" ");

    if (kind !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, getJwtSecret()) as PatientJwtPayload;

    if (!payload?.id || payload.role !== "patient") {
      return res.status(401).json({ message: "Invalid token" });
    }

    (req as any).patientId = payload.id;
    (req as any).patientEmail = payload.email;

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
