import type { Role } from "./types";

/** 顯示名稱：Admin＝系統管理者；Staff＝一般使用者（員工） */
export function roleLabel(role: Role): string {
  return role === "Admin" ? "系統管理者" : "一般使用者（員工）";
}

export function roleShortLabel(role: Role): string {
  return role === "Admin" ? "系統管理者" : "一般使用者";
}

export function roleWorkspaceTitle(role: Role): string {
  return role === "Admin" ? "系統管理者工作台" : "員工查詢工作台";
}
