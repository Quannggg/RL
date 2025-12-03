export function getRoleFromRequest(req: any): string {
  // Production: req.user?.role (từ passport/jwt)
  if (req.user && req.user.role) return String(req.user.role).toLowerCase();
  const header = req.headers['x-user-role'];
  if (header) return String(header).toLowerCase();
  return 'default';
}
