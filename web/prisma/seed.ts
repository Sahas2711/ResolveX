import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding ResolveX database...");

  // ----------------------------------------------
  // 1. Seed Permissions
  // ----------------------------------------------
  const permissionData = [
    // Complaints
    { name: "complaint:create", description: "Create new complaints" },
    { name: "complaint:read:own", description: "View own complaints" },
    { name: "complaint:read:all", description: "View all complaints" },
    { name: "complaint:update", description: "Update complaint fields" },
    { name: "complaint:update:status", description: "Change complaint status" },
    { name: "complaint:reassign", description: "Reassign complaints" },
    { name: "complaint:escalate", description: "Escalate complaints" },
    { name: "complaint:resolve", description: "Submit resolution" },
    { name: "complaint:close", description: "Close complaints" },
    { name: "complaint:reopen", description: "Reopen complaints" },
    { name: "complaint:comment", description: "Add comments to complaints" },
    { name: "complaint:attachment", description: "Upload and manage attachments" },
    // Products
    { name: "product:create", description: "Create products" },
    { name: "product:read", description: "View product data" },
    { name: "product:update", description: "Update products" },
    { name: "product:delete", description: "Delete products" },
    // Teams
    { name: "team:create", description: "Create teams" },
    { name: "team:read", description: "View team data" },
    { name: "team:update", description: "Update teams" },
    { name: "team:delete", description: "Delete teams" },
    { name: "team:member:add", description: "Add team members" },
    { name: "team:member:remove", description: "Remove team members" },
    // Dashboards
    { name: "dashboard:staff", description: "View staff dashboard" },
    { name: "dashboard:team", description: "View team dashboard" },
    { name: "dashboard:product", description: "View product dashboard" },
    { name: "dashboard:executive", description: "View executive dashboard" },
    // Users & Roles
    { name: "user:read", description: "View user data" },
    { name: "user:update", description: "Update users" },
    { name: "user:delete", description: "Delete users" },
    { name: "user:manage", description: "Manage user roles" },
    { name: "role:read", description: "View roles" },
    { name: "role:create", description: "Create roles" },
    { name: "role:update", description: "Update roles" },
    { name: "role:delete", description: "Delete roles" },
    { name: "permission:read", description: "View permissions" },
    { name: "permission:create", description: "Create permissions" },
    // Audit & System
    { name: "audit:read", description: "View audit logs" },
    { name: "system:settings", description: "Manage system settings" },
    // Webhooks
    { name: "webhook:manage", description: "Manage webhook subscriptions" },
  ];

  const permissions = await Promise.all(
    permissionData.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      })
    )
  );
  console.log(`✅ Created ${permissions.length} permissions`);

  const permMap = Object.fromEntries(
    permissions.map((p) => [p.name, p.id])
  );

  // ----------------------------------------------
  // 2. Seed Roles
  // ----------------------------------------------
  const roleData: Array<{
    name: string;
    description: string;
    permissions: string[];
  }> = [
    {
      name: "CUSTOMER",
      description: "End-user who submits complaints",
      permissions: [
        "complaint:create",
        "complaint:read:own",
        "complaint:comment",
        "complaint:attachment",
        "product:read",
      ],
    },
    {
      name: "SUPPORT_AGENT",
      description: "Support staff handling complaints",
      permissions: [
        "complaint:read:all",
        "complaint:update",
        "complaint:update:status",
        "complaint:resolve",
        "complaint:comment",
        "complaint:attachment",
        "product:read",
        "dashboard:staff",
      ],
    },
    {
      name: "TEAM_LEAD",
      description: "Team lead with oversight and reassignment privileges",
      permissions: [
        "complaint:read:all",
        "complaint:update",
        "complaint:update:status",
        "complaint:reassign",
        "complaint:escalate",
        "complaint:resolve",
        "complaint:close",
        "complaint:reopen",
        "complaint:comment",
        "complaint:attachment",
        "product:read",
        "dashboard:staff",
        "dashboard:team",
        "team:read",
      ],
    },
    {
      name: "PRODUCT_MANAGER",
      description: "Product owner managing product configuration",
      permissions: [
        "complaint:read:all",
        "complaint:comment",
        "complaint:attachment",
        "product:create",
        "product:read",
        "product:update",
        "product:delete",
        "team:read",
        "dashboard:product",
      ],
    },
    {
      name: "ADMIN",
      description: "System administrator with full access",
      permissions: [
        "complaint:create",
        "complaint:read:own",
        "complaint:read:all",
        "complaint:update",
        "complaint:update:status",
        "complaint:reassign",
        "complaint:escalate",
        "complaint:resolve",
        "complaint:close",
        "complaint:reopen",
        "complaint:comment",
        "complaint:attachment",
        "product:create",
        "product:read",
        "product:update",
        "product:delete",
        "team:create",
        "team:read",
        "team:update",
        "team:delete",
        "team:member:add",
        "team:member:remove",
        "dashboard:staff",
        "dashboard:team",
        "dashboard:product",
        "dashboard:executive",
        "user:read",
        "user:update",
        "user:delete",
        "user:manage",
        "role:read",
        "role:create",
        "role:update",
        "role:delete",
        "permission:read",
        "permission:create",
        "audit:read",
        "system:settings",
        "webhook:manage",
      ],
    },
  ];

  for (const role of roleData) {
    const existingRole = await prisma.role.findUnique({
      where: { name: role.name },
    });

    if (existingRole) {
      // Update permissions for existing role
      await prisma.rolePermission.deleteMany({
        where: { roleId: existingRole.id },
      });
      await prisma.rolePermission.createMany({
        data: role.permissions.map((perm) => ({
          roleId: existingRole.id,
          permissionId: permMap[perm],
        })),
      });
      console.log(`✅ Updated role: ${role.name}`);
    } else {
      const createdRole = await prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          rolePermissions: {
            create: role.permissions.map((perm) => ({
              permissionId: permMap[perm],
            })),
          },
        },
      });
      console.log(`✅ Created role: ${createdRole.name}`);
    }
  }

  // ----------------------------------------------
  // 3. Seed Admin User
  // ----------------------------------------------
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@resolvex.com" },
    update: {},
    create: {
      employeeId: "ADMIN-001",
      firstName: "System",
      lastName: "Administrator",
      email: "admin@resolvex.com",
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
      isActive: true,
    },
  });

  // Assign ADMIN role
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "ADMIN" },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // ----------------------------------------------
  // 4. Seed Default Product Categories
  // ----------------------------------------------
  const productCategories = [
    { name: "Software", description: "Software products and applications" },
    { name: "Hardware", description: "Physical hardware devices" },
    { name: "Mobile App", description: "Mobile application platforms" },
    { name: "Web Platform", description: "Web-based platforms and services" },
  ];

  for (const cat of productCategories) {
    await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ Created ${productCategories.length} product categories`);

  // ----------------------------------------------
  // 5. Seed Complaint Categories
  // ----------------------------------------------
  const complaintCategories = [
    { name: "Login Issue", description: "Problems with authentication and login" },
    { name: "Payment Failure", description: "Issues with payments and transactions" },
    { name: "Performance Issue", description: "Slow or degraded system performance" },
    { name: "Security Issue", description: "Security vulnerabilities or concerns" },
    { name: "Feature Request", description: "Requests for new features" },
    { name: "Bug Report", description: "Technical bugs and glitches" },
    { name: "Account Issue", description: "Account management and access issues" },
    { name: "Data Loss", description: "Missing or corrupted data" },
  ];

  for (const cat of complaintCategories) {
    await prisma.complaintCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ Created ${complaintCategories.length} complaint categories`);

  console.log("\n🎉 Seeding complete!");
  console.log("   Admin login: admin@resolvex.com / Admin@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
