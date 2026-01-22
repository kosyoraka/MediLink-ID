import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  id: string;
  email?: string;
  role?: "staff" | "patient";
  providerId?: string;
  hospitalId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      staffId?: string;
      staffHospitalId?: string;
      patientId?: string;
    }
  }
}

function getToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
}

/**
 * Generic JWT check (used by patient routes)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * Staff-only auth
 */
export function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (decoded.role !== "staff") {
      return res.status(403).json({ message: "Staff access only" });
    }

    req.user = decoded;
    req.staffId = decoded.id;
    req.staffHospitalId = decoded.hospitalId;

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * Patient-only auth
 */
export function requirePatientAuth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (decoded.role !== "patient") {
      return res.status(403).json({ message: "Patient access only" });
    }

    req.user = decoded;
    req.patientId = decoded.id;

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
