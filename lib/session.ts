export type UserSession = {
  id: number;
  name: string;
  email: string;
  user_type: "admin" | "partner_company" | "client" | string;
  is_active: boolean;
};

export type PartnerCompanySession = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  user_id: number;
};

export type ClientSession = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  password?: string | null;
  client_type?: string;
  mei_created_at?: string | null;
  is_active: boolean;
  partner_company_id: number | null;
};

const USER_KEY = "user";
const PARTNER_COMPANY_KEY = "partnerCompany";
const CLIENT_KEY = "client";
const PARTNER_COMPANY_ID_KEY = "partner_company_id";

export function getUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch (error) {
    console.error("Erro ao ler sessão do usuário:", error);
    return null;
  }
}

export function getPartnerCompanySession(): PartnerCompanySession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PARTNER_COMPANY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PartnerCompanySession;
  } catch (error) {
    console.error("Erro ao ler sessão da empresa:", error);
    return null;
  }
}

export function getClientSession(): ClientSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClientSession;
  } catch (error) {
    console.error("Erro ao ler sessão do cliente:", error);
    return null;
  }
}

export function saveUserSession(user: UserSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function savePartnerCompanySession(company: PartnerCompanySession) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PARTNER_COMPANY_KEY, JSON.stringify(company));
  localStorage.setItem(PARTNER_COMPANY_ID_KEY, String(company.id));
}

export function saveClientSession(client: ClientSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export function clearUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function clearPartnerCompanySession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PARTNER_COMPANY_KEY);
  localStorage.removeItem(PARTNER_COMPANY_ID_KEY);
}

export function clearClientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CLIENT_KEY);
}

export function clearAllSessions() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PARTNER_COMPANY_KEY);
  localStorage.removeItem(CLIENT_KEY);
  localStorage.removeItem(PARTNER_COMPANY_ID_KEY);
}

export function getRawPartnerCompanyId(): number | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PARTNER_COMPANY_ID_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isAdmin(user: UserSession | null) {
  return !!user && user.user_type === "admin" && user.is_active === true;
}

export function isPartnerCompany(user: UserSession | null) {
  return !!user && user.user_type === "partner_company" && user.is_active === true;
}

export function isClient(user: UserSession | null) {
  return !!user && user.user_type === "client" && user.is_active === true;
}