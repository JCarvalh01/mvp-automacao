"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getClientSession,
  getPartnerCompanySession,
  getUserSession,
  isAdmin,
  isClient,
  isPartnerCompany,
} from "@/lib/session";

type AllowedRole = "admin" | "partner_company" | "client";

export function useProtectedRoute(allowedRoles: AllowedRole[]) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUserSession();
    const partnerCompany = getPartnerCompanySession();
    const client = getClientSession();

    if (!user || !user.is_active) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    const roleIsAllowed =
      (allowedRoles.includes("admin") && isAdmin(user)) ||
      (allowedRoles.includes("partner_company") && isPartnerCompany(user)) ||
      (allowedRoles.includes("client") && isClient(user));

    if (!roleIsAllowed) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    // validações extras
    if (allowedRoles.includes("partner_company") && !partnerCompany) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    if (allowedRoles.includes("client") && !client) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    setAuthorized(true);
    setLoading(false);
  }, [allowedRoles, router]);

  return {
    loading,
    authorized,
  };
}