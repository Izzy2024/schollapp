import prisma from '@/lib/prisma';

// DB-backed hasPermission() needs a real Permission + Role + RolePermission + UserRole row.
export async function seedPermission(tenantId: string, userId: string, code: string) {
  const permission = await prisma.permission.upsert({
    where: { code },
    update: {},
    create: { code, description: `test seed: ${code}` },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `test-${code}-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}
