-- =============================================================================
-- ResolveX — Sample Data Seed Script (Double-Quoted Columns for PostgreSQL)
-- PostgreSQL folds unquoted identifiers to lowercase, but Prisma tables use
-- quoted camelCase (e.g., "createdAt"). All column names are double-quoted.
-- Run: psql -U postgres -d resolvex -f Scripts/seed-sample-data.sql
-- Must run 'npx prisma db seed' first to populate roles/permissions tables.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PRODUCT CATEGORIES (5 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO product_categories ("id", "name", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Software', 'Desktop and enterprise software applications', NOW(), NOW()),
  (gen_random_uuid(), 'Hardware', 'Physical devices and peripherals', NOW(), NOW()),
  (gen_random_uuid(), 'Cloud Services', 'SaaS and cloud-hosted platforms', NOW(), NOW()),
  (gen_random_uuid(), 'Mobile Apps', 'iOS and Android mobile applications', NOW(), NOW()),
  (gen_random_uuid(), 'API & Integrations', 'Third-party integrations and API services', NOW(), NOW())
  ON CONFLICT ("name") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USERS (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
-- Password for all: Test@123
INSERT INTO users ("id", "employeeId", "firstName", "lastName", "email", "passwordHash", "status", "isActive", "phone", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'ADM-001', 'System', 'Administrator', 'admin@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0100', NOW() - INTERVAL '90 days', NOW()),
  (gen_random_uuid(), 'TL-001', 'Sarah', 'Chen', 'sarah.chen@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0101', NOW() - INTERVAL '85 days', NOW()),
  (gen_random_uuid(), 'TL-002', 'Marcus', 'Johnson', 'marcus.j@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0102', NOW() - INTERVAL '80 days', NOW()),
  (gen_random_uuid(), 'SA-001', 'Emily', 'Rodriguez', 'emily.r@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0103', NOW() - INTERVAL '75 days', NOW()),
  (gen_random_uuid(), 'SA-002', 'James', 'Williams', 'james.w@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0104', NOW() - INTERVAL '70 days', NOW()),
  (gen_random_uuid(), 'SA-003', 'Priya', 'Patel', 'priya.p@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0105', NOW() - INTERVAL '65 days', NOW()),
  (gen_random_uuid(), 'SA-004', 'Alex', 'Kim', 'alex.kim@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0106', NOW() - INTERVAL '60 days', NOW()),
  (gen_random_uuid(), 'SA-005', 'Olivia', 'Taylor', 'olivia.t@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0107', NOW() - INTERVAL '55 days', NOW()),
  (gen_random_uuid(), 'PM-001', 'David', 'Brown', 'david.b@resolvex.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0108', NOW() - INTERVAL '50 days', NOW()),
  (gen_random_uuid(), 'CU-001', 'Alice', 'Martinez', 'alice.m@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0109', NOW() - INTERVAL '45 days', NOW()),
  (gen_random_uuid(), 'CU-002', 'Bob', 'Anderson', 'bob.a@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0110', NOW() - INTERVAL '40 days', NOW()),
  (gen_random_uuid(), 'CU-003', 'Carol', 'Thompson', 'carol.t@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0111', NOW() - INTERVAL '35 days', NOW()),
  (gen_random_uuid(), 'CU-004', 'Daniel', 'Garcia', 'daniel.g@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0112', NOW() - INTERVAL '30 days', NOW()),
  (gen_random_uuid(), 'CU-005', 'Eve', 'Wilson', 'eve.w@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0113', NOW() - INTERVAL '25 days', NOW()),
  (gen_random_uuid(), 'CU-006', 'Frank', 'Lee', 'frank.lee@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0114', NOW() - INTERVAL '20 days', NOW()),
  (gen_random_uuid(), 'CU-007', 'Grace', 'Wang', 'grace.w@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0115', NOW() - INTERVAL '15 days', NOW()),
  (gen_random_uuid(), 'CU-008', 'Henry', 'Davis', 'henry.d@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0116', NOW() - INTERVAL '14 days', NOW()),
  (gen_random_uuid(), 'CU-009', 'Ivy', 'Martinez', 'ivy.m@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'SUSPENDED', false, '+1-555-0117', NOW() - INTERVAL '10 days', NOW()),
  (gen_random_uuid(), 'CU-010', 'Jack', 'White', 'jack.w@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'ACTIVE', true, '+1-555-0118', NOW() - INTERVAL '7 days', NOW()),
  (gen_random_uuid(), 'CU-011', 'Kate', 'Brown', 'kate.b@email.com', '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Z0Z0Z0Z0Z0Z0Z0u', 'INACTIVE', false, '+1-555-0119', NOW() - INTERVAL '5 days', NOW())
  ON CONFLICT ("email") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PRODUCTS (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO products ("id", "productCode", "productName", "description", "categoryId", "status", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'PRD-CRM-001', 'ResolveX CRM', 'Enterprise customer relationship management platform', (SELECT id FROM product_categories WHERE "name" = 'Software'), 'ACTIVE', NOW() - INTERVAL '80 days', NOW()),
  (gen_random_uuid(), 'PRD-POS-001', 'ResolveX POS', 'Point of sale system for retail businesses', (SELECT id FROM product_categories WHERE "name" = 'Software'), 'ACTIVE', NOW() - INTERVAL '75 days', NOW()),
  (gen_random_uuid(), 'PRD-INV-001', 'ResolveX Inventory', 'Real-time inventory management and tracking', (SELECT id FROM product_categories WHERE "name" = 'Software'), 'ACTIVE', NOW() - INTERVAL '70 days', NOW()),
  (gen_random_uuid(), 'PRD-BIL-001', 'ResolveX Billing', 'Automated billing and subscription management', (SELECT id FROM product_categories WHERE "name" = 'Software'), 'ACTIVE', NOW() - INTERVAL '65 days', NOW()),
  (gen_random_uuid(), 'PRD-ANA-001', 'ResolveX Analytics', 'Business intelligence and analytics dashboard', (SELECT id FROM product_categories WHERE "name" = 'Software'), 'ACTIVE', NOW() - INTERVAL '60 days', NOW()),
  (gen_random_uuid(), 'PRD-PAY-001', 'ResolveX Payments', 'Payment processing and gateway integration', (SELECT id FROM product_categories WHERE "name" = 'Cloud Services'), 'ACTIVE', NOW() - INTERVAL '55 days', NOW()),
  (gen_random_uuid(), 'PRD-AUTH-001', 'ResolveX Auth', 'Identity and access management service', (SELECT id FROM product_categories WHERE "name" = 'Cloud Services'), 'ACTIVE', NOW() - INTERVAL '50 days', NOW()),
  (gen_random_uuid(), 'PRD-NOT-001', 'ResolveX Notify', 'Multi-channel notification service (SMS, email, push)', (SELECT id FROM product_categories WHERE "name" = 'Cloud Services'), 'ACTIVE', NOW() - INTERVAL '45 days', NOW()),
  (gen_random_uuid(), 'PRD-CDN-001', 'ResolveX CDN', 'Content delivery network and media optimization', (SELECT id FROM product_categories WHERE "name" = 'Cloud Services'), 'ACTIVE', NOW() - INTERVAL '40 days', NOW()),
  (gen_random_uuid(), 'PRD-BKP-001', 'ResolveX Backup', 'Automated cloud backup and disaster recovery', (SELECT id FROM product_categories WHERE "name" = 'Cloud Services'), 'ACTIVE', NOW() - INTERVAL '35 days', NOW()),
  (gen_random_uuid(), 'PRD-SCN-001', 'ResolveX Scanner', 'Document scanning and OCR processing device', (SELECT id FROM product_categories WHERE "name" = 'Hardware'), 'ACTIVE', NOW() - INTERVAL '30 days', NOW()),
  (gen_random_uuid(), 'PRD-RDR-001', 'ResolveX Reader', 'Contactless card and ID reader terminal', (SELECT id FROM product_categories WHERE "name" = 'Hardware'), 'ACTIVE', NOW() - INTERVAL '28 days', NOW()),
  (gen_random_uuid(), 'PRD-PRN-001', 'ResolveX Printer', 'High-volume receipt and label printer', (SELECT id FROM product_categories WHERE "name" = 'Hardware'), 'ACTIVE', NOW() - INTERVAL '26 days', NOW()),
  (gen_random_uuid(), 'PRD-BCN-001', 'ResolveX Beacon', 'Bluetooth proximity beacon for location services', (SELECT id FROM product_categories WHERE "name" = 'Hardware'), 'DEPRECATED', NOW() - INTERVAL '24 days', NOW()),
  (gen_random_uuid(), 'PRD-RTR-001', 'ResolveX Router', 'Enterprise-grade WiFi 6 router', (SELECT id FROM product_categories WHERE "name" = 'Hardware'), 'ACTIVE', NOW() - INTERVAL '22 days', NOW()),
  (gen_random_uuid(), 'PRD-APP-IOS', 'ResolveX Mobile iOS', 'iOS companion app for customers and agents', (SELECT id FROM product_categories WHERE "name" = 'Mobile Apps'), 'ACTIVE', NOW() - INTERVAL '20 days', NOW()),
  (gen_random_uuid(), 'PRD-APP-ADR', 'ResolveX Mobile Android', 'Android companion app for customers and agents', (SELECT id FROM product_categories WHERE "name" = 'Mobile Apps'), 'ACTIVE', NOW() - INTERVAL '18 days', NOW()),
  (gen_random_uuid(), 'PRD-API-001', 'ResolveX Public API', 'RESTful public API for third-party integrations', (SELECT id FROM product_categories WHERE "name" = 'API & Integrations'), 'ACTIVE', NOW() - INTERVAL '16 days', NOW()),
  (gen_random_uuid(), 'PRD-WEB-001', 'ResolveX Webhook', 'Webhook delivery and event subscription service', (SELECT id FROM product_categories WHERE "name" = 'API & Integrations'), 'ACTIVE', NOW() - INTERVAL '14 days', NOW()),
  (gen_random_uuid(), 'PRD-SYNC-001', 'ResolveX Sync', 'Real-time data synchronization engine', (SELECT id FROM product_categories WHERE "name" = 'API & Integrations'), 'DISABLED', NOW() - INTERVAL '12 days', NOW());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. COMPLAINT CATEGORIES (8 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_categories ("id", "name", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Login Issue', 'Problems with authentication, login, and session management', NOW(), NOW()),
  (gen_random_uuid(), 'Payment Failure', 'Issues with payments, billing, and transaction processing', NOW(), NOW()),
  (gen_random_uuid(), 'Performance Issue', 'Slow loading, lag, or degraded system performance', NOW(), NOW()),
  (gen_random_uuid(), 'Security Concern', 'Security vulnerabilities, data privacy, or unauthorized access', NOW(), NOW()),
  (gen_random_uuid(), 'Feature Request', 'Requests for new features or enhancements', NOW(), NOW()),
  (gen_random_uuid(), 'Bug Report', 'Technical bugs, crashes, and unexpected behavior', NOW(), NOW()),
  (gen_random_uuid(), 'Account Management', 'Account creation, updates, or access management issues', NOW(), NOW()),
  (gen_random_uuid(), 'Data Integrity', 'Missing, corrupted, or inconsistent data', NOW(), NOW())
  ON CONFLICT ("name") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TEAMS (5 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO teams ("id", "teamName", "description", "managerId", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'L1 Support', 'First-line support handling initial complaint triage', (SELECT id FROM users WHERE email = 'sarah.chen@resolvex.com'), NOW() - INTERVAL '80 days', NOW()),
  (gen_random_uuid(), 'L2 Technical', 'Second-line technical support for complex issues', (SELECT id FROM users WHERE email = 'marcus.j@resolvex.com'), NOW() - INTERVAL '75 days', NOW()),
  (gen_random_uuid(), 'Billing Team', 'Billing and payment-related complaint resolution', (SELECT id FROM users WHERE email = 'sarah.chen@resolvex.com'), NOW() - INTERVAL '70 days', NOW()),
  (gen_random_uuid(), 'Product Engineering', 'Engineering team handling bug fixes and feature requests', (SELECT id FROM users WHERE email = 'david.b@resolvex.com'), NOW() - INTERVAL '65 days', NOW()),
  (gen_random_uuid(), 'Security Team', 'Security incident response and vulnerability management', (SELECT id FROM users WHERE email = 'marcus.j@resolvex.com'), NOW() - INTERVAL '60 days', NOW());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. USER ROLES (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
-- (Must run prisma db seed first to populate roles table)
INSERT INTO user_roles ("id", "userId", "roleId", "createdAt")
  SELECT gen_random_uuid(), u.id, r.id, NOW()
  FROM users u, roles r
  WHERE (u.email, r."name") IN (
    ('admin@resolvex.com', 'ADMIN'),
    ('sarah.chen@resolvex.com', 'TEAM_LEAD'),
    ('marcus.j@resolvex.com', 'TEAM_LEAD'),
    ('emily.r@resolvex.com', 'SUPPORT_AGENT'),
    ('james.w@resolvex.com', 'SUPPORT_AGENT'),
    ('priya.p@resolvex.com', 'SUPPORT_AGENT'),
    ('alex.kim@resolvex.com', 'SUPPORT_AGENT'),
    ('olivia.t@resolvex.com', 'SUPPORT_AGENT'),
    ('david.b@resolvex.com', 'PRODUCT_MANAGER'),
    ('alice.m@email.com', 'CUSTOMER'),
    ('bob.a@email.com', 'CUSTOMER'),
    ('carol.t@email.com', 'CUSTOMER'),
    ('daniel.g@email.com', 'CUSTOMER'),
    ('eve.w@email.com', 'CUSTOMER'),
    ('frank.lee@email.com', 'CUSTOMER'),
    ('grace.w@email.com', 'CUSTOMER'),
    ('henry.d@email.com', 'CUSTOMER'),
    ('ivy.m@email.com', 'CUSTOMER'),
    ('jack.w@email.com', 'CUSTOMER'),
    ('kate.b@email.com', 'CUSTOMER')
  )
  ON CONFLICT ("userId", "roleId") DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. TEAM MEMBERS (15 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO team_members ("id", "teamId", "userId", "role", "joinedAt")
  SELECT gen_random_uuid(), t.id, u.id, 'MEMBER', NOW() - INTERVAL '60 days'
  FROM teams t, users u WHERE (t."teamName", u.email) IN
  (('L1 Support', 'emily.r@resolvex.com'),
   ('L1 Support', 'priya.p@resolvex.com'),
   ('L2 Technical', 'james.w@resolvex.com'),
   ('L2 Technical', 'alex.kim@resolvex.com'),
   ('Billing Team', 'olivia.t@resolvex.com'),
   ('Billing Team', 'priya.p@resolvex.com'),
   ('Product Engineering', 'alex.kim@resolvex.com'),
   ('Security Team', 'james.w@resolvex.com'),
   ('Security Team', 'emily.r@resolvex.com'),
   ('Security Team', 'david.b@resolvex.com'));

-- Mark team leads
INSERT INTO team_members ("id", "teamId", "userId", "role", "joinedAt")
  SELECT gen_random_uuid(), t.id, u.id, 'LEAD', NOW() - INTERVAL '60 days'
  FROM teams t, users u WHERE (t."teamName", u.email) IN
  (('L1 Support', 'sarah.chen@resolvex.com'),
   ('L2 Technical', 'marcus.j@resolvex.com'),
   ('Product Engineering', 'david.b@resolvex.com'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. PRODUCT-TEAM MAPPINGS (8 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO product_team_mappings ("id", "productId", "teamId", "isPrimary", "loadWeight", "createdAt")
  SELECT gen_random_uuid(), p.id, t.id,
    CASE WHEN (p."productName", t."teamName") IN
      (('ResolveX CRM', 'L1 Support'), ('ResolveX POS', 'L2 Technical'))
    THEN true ELSE false END,
    1.0, NOW()
  FROM products p, teams t WHERE (p."productName", t."teamName") IN
  (('ResolveX CRM', 'L1 Support'),
   ('ResolveX CRM', 'L2 Technical'),
   ('ResolveX POS', 'L2 Technical'),
   ('ResolveX Billing', 'Billing Team'),
   ('ResolveX Payments', 'Billing Team'),
   ('ResolveX Analytics', 'Product Engineering'),
   ('ResolveX Auth', 'Security Team'),
   ('ResolveX Public API', 'Product Engineering'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. COMPLAINTS (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaints ("id", "ticketNumber", "title", "description", "customerId", "productId", "categoryId", "priority", "severity", "currentStatus", "assignedTeamId", "assignedAgentId", "source", "createdAt", "updatedAt", "resolvedAt")
  SELECT gen_random_uuid(),
    ticket_val, title_val, desc_val,
    (SELECT id FROM users WHERE email = customer_email),
    (SELECT id FROM products WHERE "productName" = product_name_val),
    (SELECT id FROM complaint_categories WHERE "name" = cat_name),
    priority_val::"ComplaintPriority", severity_val::"ComplaintSeverity", status_val::"ComplaintStatus",
    team_val, agent_val, source_val, created_val, updated_val, resolved_val
  FROM (VALUES
    ('REX-2026-00001'::varchar, 'Unable to log in to CRM dashboard after password reset'::varchar, 'After resetting my password, I keep getting "Invalid session" errors when trying to access the CRM.'::varchar, 'alice.m@email.com', 'ResolveX CRM', 'Login Issue', 'CRITICAL', 'SEVERE', 'IN_PROGRESS', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'james.w@resolvex.com'), 'web portal', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour', NULL),
    ('REX-2026-00002'::varchar, 'Payment not refunded after cancellation'::varchar, 'I cancelled my subscription 10 days ago but the refund has not been processed yet.'::varchar, 'bob.a@email.com', 'ResolveX Billing', 'Payment Failure', 'HIGH', 'HIGH', 'ASSIGNED', (SELECT id FROM teams WHERE "teamName" = 'Billing Team'), (SELECT id FROM users WHERE email = 'olivia.t@resolvex.com'), 'email', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 hours', NULL),
    ('REX-2026-00003'::varchar, 'Dashboard loading extremely slow'::varchar, 'The analytics dashboard takes over 30 seconds to load since the latest deployment.'::varchar, 'carol.t@email.com', 'ResolveX Analytics', 'Performance Issue', 'HIGH', 'MEDIUM', 'ESCALATED', (SELECT id FROM teams WHERE "teamName" = 'Product Engineering'), (SELECT id FROM users WHERE email = 'alex.kim@resolvex.com'), 'web portal', NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes', NULL),
    ('REX-2026-00004'::varchar, 'Cannot process credit card payments'::varchar, 'Credit card payments are failing with error code E-1042.'::varchar, 'daniel.g@email.com', 'ResolveX Payments', 'Payment Failure', 'CRITICAL', 'SEVERE', 'RESOLVED', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'priya.p@resolvex.com'), 'API', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '4 hours'),
    ('REX-2026-00005'::varchar, 'Feature request: Bulk export functionality'::varchar, 'We need the ability to export complaint data in bulk for quarterly reporting.'::varchar, 'eve.w@email.com', 'ResolveX Analytics', 'Feature Request', 'LOW', 'LOW', 'OPEN', NULL, NULL, 'web portal', NOW() - INTERVAL '2 days', NOW(), NULL),
    ('REX-2026-00006'::varchar, 'Mobile app crashes on startup'::varchar, 'The iOS app crashes immediately after the splash screen on iOS 18.'::varchar, 'frank.lee@email.com', 'ResolveX Mobile iOS', 'Bug Report', 'HIGH', 'HIGH', 'IN_PROGRESS', (SELECT id FROM teams WHERE "teamName" = 'Product Engineering'), (SELECT id FROM users WHERE email = 'david.b@resolvex.com'), 'mobile app', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 hours', NULL),
    ('REX-2026-00007'::varchar, 'Unauthorized access alert in Auth service'::varchar, 'Multiple failed login attempts detected from an unknown IP address.'::varchar, 'grace.w@email.com', 'ResolveX Auth', 'Security Concern', 'CRITICAL', 'SEVERE', 'CLOSED', (SELECT id FROM teams WHERE "teamName" = 'Security Team'), (SELECT id FROM users WHERE email = 'james.w@resolvex.com'), 'system alert', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days' + INTERVAL '8 hours'),
    ('REX-2026-00008'::varchar, 'Inventory stock levels not updating'::varchar, 'After receiving a shipment, the inventory system did not update stock levels.'::varchar, 'henry.d@email.com', 'ResolveX Inventory', 'Data Integrity', 'MEDIUM', 'MEDIUM', 'WAITING_CUSTOMER', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'alex.kim@resolvex.com'), 'email', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', NULL),
    ('REX-2026-00009'::varchar, 'POS terminal freezing during transactions'::varchar, 'The POS terminal freezes intermittently during checkout.'::varchar, 'alice.m@email.com', 'ResolveX POS', 'Bug Report', 'CRITICAL', 'SEVERE', 'ESCALATED', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'marcus.j@resolvex.com'), 'phone', NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 hours', NULL),
    ('REX-2026-00010'::varchar, 'Need API endpoint for webhook retry'::varchar, 'No way to manually trigger a retry through the API when webhook fails.'::varchar, 'bob.a@email.com', 'ResolveX Public API', 'Feature Request', 'LOW', 'LOW', 'OPEN', NULL, NULL, 'web portal', NOW() - INTERVAL '1 day', NOW(), NULL),
    ('REX-2026-00011'::varchar, 'Backup restoration failed'::varchar, 'Backup restoration attempt failed with a checksum error.'::varchar, 'carol.t@email.com', 'ResolveX Backup', 'Data Integrity', 'CRITICAL', 'SEVERE', 'ASSIGNED', (SELECT id FROM teams WHERE "teamName" = 'Product Engineering'), (SELECT id FROM users WHERE email = 'david.b@resolvex.com'), 'system alert', NOW() - INTERVAL '12 hours', NOW(), NULL),
    ('REX-2026-00012'::varchar, 'Email notifications not being sent'::varchar, 'Users not receiving email notifications for complaint updates.'::varchar, 'daniel.g@email.com', 'ResolveX Notify', 'Bug Report', 'HIGH', 'HIGH', 'RESOLVED', (SELECT id FROM teams WHERE "teamName" = 'L1 Support'), (SELECT id FROM users WHERE email = 'emily.r@resolvex.com'), 'email', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '6 hours'),
    ('REX-2026-00013'::varchar, 'Scanner not detecting documents'::varchar, 'The document scanner is not picking up pages fed through the ADF.'::varchar, 'eve.w@email.com', 'ResolveX Scanner', 'Bug Report', 'MEDIUM', 'MEDIUM', 'WAITING_CUSTOMER', (SELECT id FROM teams WHERE "teamName" = 'L1 Support'), (SELECT id FROM users WHERE email = 'priya.p@resolvex.com'), 'phone', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days', NULL),
    ('REX-2026-00014'::varchar, 'User account cannot be unlocked'::varchar, 'Account locked after too many attempts -- unlock link leads to error page.'::varchar, 'frank.lee@email.com', 'ResolveX Auth', 'Account Management', 'HIGH', 'MEDIUM', 'IN_PROGRESS', (SELECT id FROM teams WHERE "teamName" = 'L1 Support'), (SELECT id FROM users WHERE email = 'emily.r@resolvex.com'), 'web portal', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 hours', NULL),
    ('REX-2026-00015'::varchar, 'Android app notifications delayed'::varchar, 'Push notifications on Android arrive 15-30 minutes late.'::varchar, 'grace.w@email.com', 'ResolveX Mobile Android', 'Performance Issue', 'MEDIUM', 'LOW', 'ASSIGNED', (SELECT id FROM teams WHERE "teamName" = 'Product Engineering'), (SELECT id FROM users WHERE email = 'alex.kim@resolvex.com'), 'mobile app', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NULL),
    ('REX-2026-00016'::varchar, 'Billing invoice shows incorrect amount'::varchar, 'Monthly invoice shows $499 instead of agreed $299 for past 2 months.'::varchar, 'henry.d@email.com', 'ResolveX Billing', 'Payment Failure', 'HIGH', 'MEDIUM', 'REOPENED', (SELECT id FROM teams WHERE "teamName" = 'Billing Team'), (SELECT id FROM users WHERE email = 'olivia.t@resolvex.com'), 'email', NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 hour', NULL),
    ('REX-2026-00017'::varchar, 'Report export generates corrupted file'::varchar, 'Exported Excel quarterly reports are corrupted -- CSV works fine.'::varchar, 'alice.m@email.com', 'ResolveX Analytics', 'Bug Report', 'MEDIUM', 'LOW', 'OPEN', NULL, NULL, 'web portal', NOW() - INTERVAL '2 days', NOW(), NULL),
    ('REX-2026-00018'::varchar, 'CDN serving stale content'::varchar, 'Static assets served from old CDN cache despite updates 48 hours ago.'::varchar, 'bob.a@email.com', 'ResolveX CDN', 'Performance Issue', 'HIGH', 'MEDIUM', 'ASSIGNED', (SELECT id FROM teams WHERE "teamName" = 'Product Engineering'), (SELECT id FROM users WHERE email = 'marcus.j@resolvex.com'), 'ticket', NOW() - INTERVAL '3 days', NOW() - INTERVAL '12 hours', NULL),
    ('REX-2026-00019'::varchar, 'Card reader not working after firmware update'::varchar, 'Contactless card reader shows red LED after latest firmware update.'::varchar, 'carol.t@email.com', 'ResolveX Reader', 'Bug Report', 'HIGH', 'HIGH', 'IN_PROGRESS', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'james.w@resolvex.com'), 'phone', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours', NULL),
    ('REX-2026-00020'::varchar, 'Data sync failing between POS and Inventory'::varchar, 'Sales from POS not syncing to Inventory -- causing overselling.'::varchar, 'daniel.g@email.com', 'ResolveX Sync', 'Data Integrity', 'CRITICAL', 'SEVERE', 'CLOSED', (SELECT id FROM teams WHERE "teamName" = 'L2 Technical'), (SELECT id FROM users WHERE email = 'alex.kim@resolvex.com'), 'system alert', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '2 days')
  ) AS v(ticket_val, title_val, desc_val, customer_email, product_name_val, cat_name, priority_val, severity_val, status_val, team_val, agent_val, source_val, created_val, updated_val, resolved_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. COMMENTS (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_comments ("id", "complaintId", "userId", "content", "isInternal", "createdAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    (SELECT id FROM users WHERE email = email_val),
    content_val, is_internal, created_val
  FROM (VALUES
    ('REX-2026-00001', 'james.w@resolvex.com', 'I have investigated the session issue. It appears the JWT token is not being refreshed properly after password reset. Working on a fix.', false, NOW() - INTERVAL '4 days'),
    ('REX-2026-00001', 'alice.m@email.com', 'Thank you for looking into this. Is there a temporary workaround?', false, NOW() - INTERVAL '3 days'),
    ('REX-2026-00002', 'olivia.t@resolvex.com', 'The refund was processed but got stuck in the payment gateway. I have manually triggered it again.', false, NOW() - INTERVAL '9 days'),
    ('REX-2026-00002', 'olivia.t@resolvex.com', 'The refund should reflect in 2-3 business days. Monitoring for confirmation.', true, NOW() - INTERVAL '9 days'),
    ('REX-2026-00003', 'alex.kim@resolvex.com', 'Root cause identified -- memory leak in new chart rendering library. Rolling back.', true, NOW() - INTERVAL '2 days'),
    ('REX-2026-00004', 'priya.p@resolvex.com', 'Payment gateway was returning timeout. Restarted service -- all pending transactions processed.', false, NOW() - INTERVAL '6 days'),
    ('REX-2026-00004', 'daniel.g@email.com', 'Confirmed payments are going through now. Thank you!', false, NOW() - INTERVAL '6 days'),
    ('REX-2026-00006', 'david.b@resolvex.com', 'Crash related to iOS 18 SwiftUI compatibility. Fix in QA -- release tomorrow.', true, NOW() - INTERVAL '3 days'),
    ('REX-2026-00007', 'james.w@resolvex.com', 'Blocked the IP address and implemented rate limiting. Brute force from known malicious range.', false, NOW() - INTERVAL '14 days'),
    ('REX-2026-00008', 'alex.kim@resolvex.com', 'Could you confirm the shipment ID and quantity received? This will help trace the sync issue.', false, NOW() - INTERVAL '5 days'),
    ('REX-2026-00009', 'emily.r@resolvex.com', 'Escalating to L2. Affecting revenue during peak hours.', true, NOW() - INTERVAL '7 days'),
    ('REX-2026-00012', 'emily.r@resolvex.com', 'SMTP configuration had a typo in server address. Corrected -- all queued emails delivered.', false, NOW() - INTERVAL '19 days'),
    ('REX-2026-00013', 'priya.p@resolvex.com', 'Please clean the ADF rollers with a lint-free cloth. Will arrange replacement if persists.', false, NOW() - INTERVAL '8 days'),
    ('REX-2026-00014', 'emily.r@resolvex.com', 'Unlock link token was expiring too quickly. Extended expiry to 30 minutes.', false, NOW() - INTERVAL '2 days'),
    ('REX-2026-00014', 'frank.lee@email.com', 'Account unlocked now. The new link worked perfectly. Thank you!', false, NOW() - INTERVAL '2 days'),
    ('REX-2026-00016', 'olivia.t@resolvex.com', 'Billing system re-generated incorrect amount. Checking recurring billing rules.', true, NOW() - INTERVAL '24 days'),
    ('REX-2026-00018', 'marcus.j@resolvex.com', 'CDN purge not propagating due to regional edge node issue. Forced full cache invalidation.', false, NOW() - INTERVAL '2 days'),
    ('REX-2026-00019', 'james.w@resolvex.com', 'Firmware update has NFC module regression. Rolling back affected devices.', true, NOW() - INTERVAL '4 days'),
    ('REX-2026-00020', 'alex.kim@resolvex.com', 'Sync queue had a deadlock condition. Service restarted -- pending transactions reconciled.', false, NOW() - INTERVAL '29 days'),
    ('REX-2026-00020', 'daniel.g@email.com', 'Can confirm inventory levels syncing correctly now. Thank you!', false, NOW() - INTERVAL '28 days')
  ) AS v(ticket_val, email_val, content_val, is_internal, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. ASSIGNMENTS (15 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_assignments ("id", "complaintId", "assignedTeamId", "assignedAgentId", "assignedBy", "assignmentReason", "createdAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    (SELECT id FROM teams WHERE "teamName" = team_val),
    (SELECT id FROM users WHERE email = agent_val),
    source_val::"AssignmentSource", reason_val, created_val
  FROM (VALUES
    ('REX-2026-00001', 'L2 Technical', 'james.w@resolvex.com', 'SYSTEM', 'Auto-assigned based on product and priority', NOW() - INTERVAL '5 days'),
    ('REX-2026-00002', 'Billing Team', 'olivia.t@resolvex.com', 'SYSTEM', 'Billing category -- auto-assigned', NOW() - INTERVAL '10 days'),
    ('REX-2026-00003', 'Product Engineering', 'alex.kim@resolvex.com', 'SYSTEM', 'Performance issue -- assigned to engineering', NOW() - INTERVAL '3 days'),
    ('REX-2026-00004', 'L2 Technical', 'priya.p@resolvex.com', 'SYSTEM', 'Critical payment issue -- highest priority', NOW() - INTERVAL '7 days'),
    ('REX-2026-00006', 'Product Engineering', 'david.b@resolvex.com', 'LEAD', 'Mobile crash expertise needed -- assigned by lead', NOW() - INTERVAL '4 days'),
    ('REX-2026-00007', 'Security Team', 'james.w@resolvex.com', 'SYSTEM', 'Security incident -- auto-assigned', NOW() - INTERVAL '15 days'),
    ('REX-2026-00009', 'L2 Technical', 'marcus.j@resolvex.com', 'LEAD', 'Escalated from L1 -- senior intervention needed', NOW() - INTERVAL '8 days'),
    ('REX-2026-00011', 'Product Engineering', 'david.b@resolvex.com', 'ADMIN', 'Critical data loss -- admin assigned', NOW() - INTERVAL '12 hours'),
    ('REX-2026-00012', 'L1 Support', 'emily.r@resolvex.com', 'SYSTEM', 'Email issue -- L1 triage', NOW() - INTERVAL '20 days'),
    ('REX-2026-00014', 'L1 Support', 'emily.r@resolvex.com', 'SYSTEM', 'Account management issue', NOW() - INTERVAL '3 days'),
    ('REX-2026-00015', 'Product Engineering', 'alex.kim@resolvex.com', 'LEAD', 'Android issue -- assigned to specialist', NOW() - INTERVAL '4 days'),
    ('REX-2026-00016', 'Billing Team', 'olivia.t@resolvex.com', 'SYSTEM', 'Billing dispute -- auto-assigned', NOW() - INTERVAL '25 days'),
    ('REX-2026-00018', 'Product Engineering', 'marcus.j@resolvex.com', 'LEAD', 'CDN infrastructure issue -- escalation', NOW() - INTERVAL '3 days'),
    ('REX-2026-00019', 'L2 Technical', 'james.w@resolvex.com', 'SYSTEM', 'Hardware firmware -- L2 required', NOW() - INTERVAL '5 days'),
    ('REX-2026-00020', 'L2 Technical', 'alex.kim@resolvex.com', 'SYSTEM', 'Sync infrastructure -- auto-assigned', NOW() - INTERVAL '30 days')
  ) AS v(ticket_val, team_val, agent_val, source_val, reason_val, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. STATUS HISTORY (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_status_history ("id", "complaintId", "oldStatus", "newStatus", "changedBy", "remarks", "createdAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    old_val::"ComplaintStatus", new_val::"ComplaintStatus",
    (SELECT id FROM users WHERE email = email_val),
    remarks_val, created_val
  FROM (VALUES
    ('REX-2026-00001', 'OPEN', 'ASSIGNED', 'james.w@resolvex.com', 'Auto-assigned by system', NOW() - INTERVAL '5 days'),
    ('REX-2026-00001', 'ASSIGNED', 'IN_PROGRESS', 'james.w@resolvex.com', 'Started investigating session issue', NOW() - INTERVAL '4 days'),
    ('REX-2026-00002', 'OPEN', 'ASSIGNED', 'olivia.t@resolvex.com', 'Assigned to billing team', NOW() - INTERVAL '10 days'),
    ('REX-2026-00003', 'ASSIGNED', 'ESCALATED', 'alex.kim@resolvex.com', 'Requires code fix -- escalated', NOW() - INTERVAL '2 days'),
    ('REX-2026-00004', 'OPEN', 'ASSIGNED', 'priya.p@resolvex.com', 'Critical -- immediate assignment', NOW() - INTERVAL '7 days'),
    ('REX-2026-00004', 'ASSIGNED', 'IN_PROGRESS', 'priya.p@resolvex.com', 'Investigating gateway timeout', NOW() - INTERVAL '7 days'),
    ('REX-2026-00004', 'IN_PROGRESS', 'RESOLVED', 'priya.p@resolvex.com', 'Service restarted -- transactions flowing', NOW() - INTERVAL '6 days' + INTERVAL '4 hours'),
    ('REX-2026-00007', 'OPEN', 'ASSIGNED', 'james.w@resolvex.com', 'Security incident -- immediate priority', NOW() - INTERVAL '15 days'),
    ('REX-2026-00007', 'ASSIGNED', 'IN_PROGRESS', 'james.w@resolvex.com', 'Analyzing access logs', NOW() - INTERVAL '15 days'),
    ('REX-2026-00007', 'IN_PROGRESS', 'RESOLVED', 'james.w@resolvex.com', 'IP blocked -- rate limiting active', NOW() - INTERVAL '14 days'),
    ('REX-2026-00007', 'RESOLVED', 'CLOSED', 'sarah.chen@resolvex.com', 'Incident resolved and documented', NOW() - INTERVAL '13 days' + INTERVAL '8 hours'),
    ('REX-2026-00012', 'OPEN', 'ASSIGNED', 'emily.r@resolvex.com', 'L1 triage', NOW() - INTERVAL '20 days'),
    ('REX-2026-00012', 'ASSIGNED', 'IN_PROGRESS', 'emily.r@resolvex.com', 'Checking SMTP configuration', NOW() - INTERVAL '20 days'),
    ('REX-2026-00012', 'IN_PROGRESS', 'RESOLVED', 'emily.r@resolvex.com', 'SMTP typo corrected -- emails flowing', NOW() - INTERVAL '19 days'),
    ('REX-2026-00016', 'OPEN', 'ASSIGNED', 'olivia.t@resolvex.com', 'Reopened -- billing recurrence', NOW() - INTERVAL '25 days'),
    ('REX-2026-00016', 'ASSIGNED', 'REOPENED', 'olivia.t@resolvex.com', 'Billing system re-generated incorrect amount', NOW() - INTERVAL '24 days'),
    ('REX-2026-00020', 'OPEN', 'ASSIGNED', 'alex.kim@resolvex.com', 'Auto-assigned -- critical sync issue', NOW() - INTERVAL '30 days'),
    ('REX-2026-00020', 'ASSIGNED', 'IN_PROGRESS', 'alex.kim@resolvex.com', 'Diagnosing sync queue deadlock', NOW() - INTERVAL '30 days'),
    ('REX-2026-00020', 'IN_PROGRESS', 'RESOLVED', 'alex.kim@resolvex.com', 'Sync service restarted -- reconciled', NOW() - INTERVAL '29 days'),
    ('REX-2026-00020', 'RESOLVED', 'CLOSED', 'marcus.j@resolvex.com', 'Customer confirmed -- closing', NOW() - INTERVAL '28 days' + INTERVAL '2 days')
  ) AS v(ticket_val, old_val, new_val, email_val, remarks_val, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. SLA TRACKING (15 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_sla_tracking ("id", "complaintId", "responseDueAt", "resolutionDueAt", "firstResponseAt", "resolvedAt", "breachedResponseSla", "breachedResolutionSla", "createdAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    resp_due, resol_due, first_resp, resolved,
    breach_resp, breach_resol, created, updated
  FROM (VALUES
    ('REX-2026-00001', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days', NULL, false, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'),
    ('REX-2026-00002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '9 days', NULL, false, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 hours'),
    ('REX-2026-00003', NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 days', NOW() - INTERVAL '2 days', NULL, false, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes'),
    ('REX-2026-00004', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '4 hours', false, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days' + INTERVAL '4 hours'),
    ('REX-2026-00006', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NOW() - INTERVAL '3 days', NULL, false, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 hours'),
    ('REX-2026-00007', NOW() - INTERVAL '13 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days' + INTERVAL '8 hours', false, false, NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days' + INTERVAL '8 hours'),
    ('REX-2026-00009', NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '7 days', NULL, false, true, NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 hours'),
    ('REX-2026-00011', NOW() - INTERVAL '10 hours', NOW() + INTERVAL '2 days', NULL, NULL, false, false, NOW() - INTERVAL '12 hours', NOW()),
    ('REX-2026-00012', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days' + INTERVAL '6 hours', false, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days' + INTERVAL '6 hours'),
    ('REX-2026-00014', NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 days', NOW() - INTERVAL '2 days', NULL, false, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 hours'),
    ('REX-2026-00015', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NOW() - INTERVAL '3 days', NULL, false, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
    ('REX-2026-00016', NOW() - INTERVAL '23 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '24 days', NULL, false, true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 hour'),
    ('REX-2026-00018', NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 days', NOW() - INTERVAL '2 days', NULL, false, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '12 hours'),
    ('REX-2026-00019', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days', NULL, false, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours'),
    ('REX-2026-00020', NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days' + INTERVAL '2 days', false, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days' + INTERVAL '2 days')
  ) AS v(ticket_val, resp_due, resol_due, first_resp, resolved, breach_resp, breach_resol, created, updated);

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. NOTIFICATIONS (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO notifications ("id", "userId", "title", "message", "type", "isRead", "referenceId", "createdAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM users WHERE email = email_val),
    title_val, msg_val, type_val::"NotificationType", is_read,
    (SELECT id FROM complaints WHERE "ticketNumber" = ref_val),
    created_val, created_val
  FROM (VALUES
    ('alice.m@email.com', 'Complaint Assigned', 'Your complaint REX-2026-00001 has been assigned to James Williams', 'ASSIGNMENT', false, 'REX-2026-00001', NOW() - INTERVAL '4 days'),
    ('alice.m@email.com', 'New Comment', 'James Williams added a comment on your complaint', 'COMMENT', false, 'REX-2026-00001', NOW() - INTERVAL '3 days'),
    ('bob.a@email.com', 'Refund Update', 'Your refund has been processed', 'RESOLUTION', true, 'REX-2026-00002', NOW() - INTERVAL '9 days'),
    ('james.w@resolvex.com', 'New Assignment', 'Complaint REX-2026-00001 assigned to you', 'ASSIGNMENT', true, 'REX-2026-00001', NOW() - INTERVAL '5 days'),
    ('olivia.t@resolvex.com', 'New Assignment', 'Complaint REX-2026-00002 assigned to you', 'ASSIGNMENT', true, 'REX-2026-00002', NOW() - INTERVAL '10 days'),
    ('alex.kim@resolvex.com', 'Escalation Alert', 'Complaint REX-2026-00003 escalated to your team', 'ESCALATION', true, 'REX-2026-00003', NOW() - INTERVAL '2 days'),
    ('david.b@resolvex.com', 'SLA Breach Warning', 'Complaint REX-2026-00011 approaching SLA deadline', 'SLA_BREACH', false, 'REX-2026-00011', NOW() - INTERVAL '6 hours'),
    ('emily.r@resolvex.com', 'New Assignment', 'Complaint REX-2026-00012 assigned to you', 'ASSIGNMENT', true, 'REX-2026-00012', NOW() - INTERVAL '20 days'),
    ('frank.lee@email.com', 'Complaint Resolved', 'Your complaint REX-2026-00006 has been resolved', 'RESOLUTION', false, 'REX-2026-00006', NOW() - INTERVAL '3 hours'),
    ('grace.w@email.com', 'Security Alert', 'Suspicious activity detected on your account', 'SLA_BREACH', true, 'REX-2026-00007', NOW() - INTERVAL '14 days'),
    ('marcus.j@resolvex.com', 'Escalation Alert', 'Complaint REX-2026-00009 escalated to L2', 'ESCALATION', true, 'REX-2026-00009', NOW() - INTERVAL '7 days'),
    ('priya.p@resolvex.com', 'New Assignment', 'Complaint REX-2026-00004 assigned to you', 'ASSIGNMENT', true, 'REX-2026-00004', NOW() - INTERVAL '7 days'),
    ('marcus.j@resolvex.com', 'New Assignment', 'Complaint REX-2026-00018 escalated to you', 'ASSIGNMENT', true, 'REX-2026-00018', NOW() - INTERVAL '3 days'),
    ('alex.kim@resolvex.com', 'SLA Breach Warning', 'Complaint REX-2026-00008 approaching SLA deadline', 'SLA_BREACH', false, 'REX-2026-00008', NOW() - INTERVAL '1 day'),
    ('david.b@resolvex.com', 'New Comment', 'Alex Kim added a comment on REX-2026-00006', 'COMMENT', false, 'REX-2026-00006', NOW() - INTERVAL '3 days'),
    ('sarah.chen@resolvex.com', 'Team Performance Report', 'L1 Support resolved 12 complaints this week', 'RESOLUTION', false, NULL, NOW() - INTERVAL '12 hours'),
    ('alice.m@email.com', 'Survey Request', 'How would you rate your resolution experience?', 'RESOLUTION', false, 'REX-2026-00001', NOW() - INTERVAL '1 hour'),
    ('james.w@resolvex.com', 'Internal Note', 'Emily added an internal note on REX-2026-00009', 'COMMENT', true, 'REX-2026-00009', NOW() - INTERVAL '7 days'),
    ('olivia.t@resolvex.com', 'Billing Alert', 'Complaint REX-2026-00016 has been reopened', 'ESCALATION', true, 'REX-2026-00016', NOW() - INTERVAL '1 hour'),
    ('alex.kim@resolvex.com', 'New Assignment', 'Complaint REX-2026-00020 assigned to you', 'ASSIGNMENT', true, 'REX-2026-00020', NOW() - INTERVAL '30 days')
  ) AS v(email_val, title_val, msg_val, type_val, is_read, ref_val, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. PRODUCT SLA RULES (12 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO product_sla_rules ("id", "productId", "priority", "severity", "responseTimeMinutes", "resolutionTimeMinutes", "escalationTimeMinutes", "createdAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM products WHERE "productName" = product_val),
    priority_val::"ComplaintPriority", severity_val::"ComplaintSeverity",
    resp_min, resol_min, esc_min, NOW(), NOW()
  FROM (VALUES
    ('ResolveX CRM', 'CRITICAL', 'SEVERE', 15, 240, 60),
    ('ResolveX CRM', 'HIGH', 'HIGH', 30, 480, 120),
    ('ResolveX Billing', 'HIGH', 'HIGH', 60, 1440, 360),
    ('ResolveX Payments', 'CRITICAL', 'SEVERE', 15, 120, 30),
    ('ResolveX Analytics', 'LOW', 'LOW', 1440, 10080, NULL),
    ('ResolveX Auth', 'CRITICAL', 'SEVERE', 10, 180, 30),
    ('ResolveX POS', 'CRITICAL', 'SEVERE', 15, 240, 60),
    ('ResolveX Notify', 'HIGH', 'HIGH', 30, 480, 120),
    ('ResolveX Backup', 'CRITICAL', 'SEVERE', 5, 120, 15),
    ('ResolveX Mobile iOS', 'HIGH', 'HIGH', 60, 1440, 240),
    ('ResolveX Public API', 'MEDIUM', 'MEDIUM', 120, 2880, 480),
    ('ResolveX Inventory', 'MEDIUM', 'MEDIUM', 120, 2880, 360)
  ) AS v(product_val, priority_val, severity_val, resp_min, resol_min, esc_min);

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. ESCALATIONS (8 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO escalations ("id", "complaintId", "escalationLevel", "escalatedToTeam", "escalatedToUser", "reason", "createdAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    level_val::"EscalationLevel",
    (SELECT id FROM teams WHERE "teamName" = team_val),
    (SELECT id FROM users WHERE email = user_val),
    reason_val, created_val
  FROM (VALUES
    ('REX-2026-00003', 'L1', 'Product Engineering', 'david.b@resolvex.com', 'Requires code-level investigation', NOW() - INTERVAL '2 days'),
    ('REX-2026-00009', 'L1', 'L2 Technical', 'marcus.j@resolvex.com', 'POS hardware -- L1 cannot diagnose remotely', NOW() - INTERVAL '7 days'),
    ('REX-2026-00009', 'L2', 'Product Engineering', 'david.b@resolvex.com', 'Firmware level -- needs engineering', NOW() - INTERVAL '6 days'),
    ('REX-2026-00011', 'L1', 'Product Engineering', 'david.b@resolvex.com', 'Critical data loss -- admin escalation', NOW() - INTERVAL '10 hours'),
    ('REX-2026-00001', 'L2', 'Product Engineering', 'alex.kim@resolvex.com', 'JWT refresh needs backend code change', NOW() - INTERVAL '3 days'),
    ('REX-2026-00016', 'L1', 'Billing Team', 'olivia.t@resolvex.com', 'Recurring billing -- needs billing expertise', NOW() - INTERVAL '24 days'),
    ('REX-2026-00019', 'L1', 'L2 Technical', 'james.w@resolvex.com', 'Firmware regression on card reader', NOW() - INTERVAL '4 days'),
    ('REX-2026-00018', 'L2', 'Product Engineering', 'marcus.j@resolvex.com', 'CDN edge node infrastructure issue', NOW() - INTERVAL '2 days')
  ) AS v(ticket_val, level_val, team_val, user_val, reason_val, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. SLA BREACH LOGS (5 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO sla_breach_logs ("id", "complaintId", "slaType", "breachedAt", "actionTaken", "createdAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    type_val::"SlaType", breached_val, action_val, breached_val, breached_val
  FROM (VALUES
    ('REX-2026-00002', 'RESOLUTION', NOW() - INTERVAL '3 days', 'Refund processing exceeded resolution SLA. Manual intervention triggered.'),
    ('REX-2026-00009', 'RESOLUTION', NOW() - INTERVAL '3 days', 'POS terminal issue exceeded resolution SLA due to hardware dependency.'),
    ('REX-2026-00016', 'RESOLUTION', NOW() - INTERVAL '20 days', 'Billing dispute resolution exceeded SLA -- root cause in recurring billing engine.'),
    ('REX-2026-00003', 'FIRST_RESPONSE', NOW() - INTERVAL '2 days', 'First response delayed due to holiday staffing shortage.'),
    ('REX-2026-00019', 'RESOLUTION', NOW() - INTERVAL '1 day', 'Firmware fix delayed pending vendor approval.')
  ) AS v(ticket_val, type_val, breached_val, action_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. TICKET METRICS DAILY (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO ticket_metrics_daily ("id", "metricDate", "totalCreated", "totalResolved", "totalClosed", "totalReopened", "avgResolutionTime", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), date_val, created_val, resolved_val, closed_val, reopened_val, avg_res, NOW(), NOW()
  FROM (VALUES
    (NOW() - INTERVAL '19 days', 12, 10, 8, 1, 4.5),
    (NOW() - INTERVAL '18 days', 15, 13, 11, 2, 3.8),
    (NOW() - INTERVAL '17 days', 8, 7, 6, 0, 5.2),
    (NOW() - INTERVAL '16 days', 20, 18, 15, 3, 4.1),
    (NOW() - INTERVAL '15 days', 14, 12, 10, 1, 6.3),
    (NOW() - INTERVAL '14 days', 18, 16, 14, 2, 3.5),
    (NOW() - INTERVAL '13 days', 10, 9, 8, 0, 4.8),
    (NOW() - INTERVAL '12 days', 22, 20, 17, 3, 5.1),
    (NOW() - INTERVAL '11 days', 16, 14, 12, 1, 4.2),
    (NOW() - INTERVAL '10 days', 11, 10, 9, 2, 3.9),
    (NOW() - INTERVAL '9 days', 19, 17, 15, 1, 5.7),
    (NOW() - INTERVAL '8 days', 13, 11, 10, 0, 4.4),
    (NOW() - INTERVAL '7 days', 25, 22, 19, 4, 3.2),
    (NOW() - INTERVAL '6 days', 17, 15, 13, 2, 5.9),
    (NOW() - INTERVAL '5 days', 9, 8, 7, 0, 4.6),
    (NOW() - INTERVAL '4 days', 21, 19, 16, 3, 3.7),
    (NOW() - INTERVAL '3 days', 14, 12, 10, 1, 5.3),
    (NOW() - INTERVAL '2 days', 16, 14, 12, 2, 4.0),
    (NOW() - INTERVAL '1 day', 23, 20, 17, 3, 3.6),
    (NOW(), 18, 15, 13, 1, 4.7)
  ) AS v(date_val, created_val, resolved_val, closed_val, reopened_val, avg_res);

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. STAFF PERFORMANCE METRICS (8 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO staff_performance_metrics ("id", "userId", "assignedTickets", "resolvedTickets", "pendingTickets", "avgResolutionTime", "productivityScore", "calculatedAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM users WHERE email = email_val),
    assigned, resolved, pending, avg_res, score, NOW(), NOW()
  FROM (VALUES
    ('emily.r@resolvex.com', 45, 38, 7, 3.2, 84.5),
    ('james.w@resolvex.com', 52, 41, 11, 4.8, 78.8),
    ('priya.p@resolvex.com', 38, 35, 3, 2.9, 92.1),
    ('alex.kim@resolvex.com', 61, 48, 13, 5.1, 72.3),
    ('olivia.t@resolvex.com', 33, 30, 3, 3.5, 90.9),
    ('david.b@resolvex.com', 27, 25, 2, 6.2, 88.5),
    ('marcus.j@resolvex.com', 19, 18, 1, 4.0, 94.7),
    ('sarah.chen@resolvex.com', 8, 8, 0, 2.1, 97.2)
  ) AS v(email_val, assigned, resolved, pending, avg_res, score);

-- ═══════════════════════════════════════════════════════════════════════════
-- 20. TEAM PERFORMANCE METRICS (5 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO team_performance_metrics ("id", "teamId", "assignedTickets", "completedTickets", "pendingTickets", "slaCompliancePercentage", "avgResolutionTime", "calculatedAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM teams WHERE "teamName" = name_val),
    assigned, completed, pending, sla_pct, avg_res, NOW(), NOW()
  FROM (VALUES
    ('L1 Support', 120, 98, 22, 94.2, 3.5),
    ('L2 Technical', 85, 72, 13, 91.8, 4.8),
    ('Billing Team', 45, 40, 5, 96.5, 3.2),
    ('Product Engineering', 60, 52, 8, 88.3, 5.9),
    ('Security Team', 18, 17, 1, 98.1, 2.4)
  ) AS v(name_val, assigned, completed, pending, sla_pct, avg_res);

-- ═══════════════════════════════════════════════════════════════════════════
-- 21. PRODUCT COMPLAINT METRICS (10 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO product_complaint_metrics ("id", "productId", "complaintCount", "resolvedCount", "openCount", "avgResolutionTime", "calculatedAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM products WHERE "productName" = name_val),
    total, resolved, open, avg_res, NOW(), NOW()
  FROM (VALUES
    ('ResolveX CRM', 15, 12, 3, 3.8),
    ('ResolveX Billing', 12, 9, 3, 4.2),
    ('ResolveX Analytics', 8, 6, 2, 5.1),
    ('ResolveX Payments', 6, 5, 1, 3.5),
    ('ResolveX Auth', 10, 8, 2, 2.8),
    ('ResolveX POS', 7, 5, 2, 6.3),
    ('ResolveX Mobile iOS', 5, 4, 1, 4.7),
    ('ResolveX Notify', 3, 3, 0, 2.1),
    ('ResolveX Backup', 2, 1, 1, 8.0),
    ('ResolveX Public API', 4, 3, 1, 3.3)
  ) AS v(name_val, total, resolved, open, avg_res);

-- ═══════════════════════════════════════════════════════════════════════════
-- 22. COMPLAINT TIMELINE (20 rows)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO complaint_timeline ("id", "complaintId", "eventType", "actorId", "eventData", "createdAt", "updatedAt")
  SELECT gen_random_uuid(),
    (SELECT id FROM complaints WHERE "ticketNumber" = ticket_val),
    event_val::"TimelineEventType",
    (SELECT id FROM users WHERE email = actor_email),
    event_data::jsonb, created_val, created_val
  FROM (VALUES
    ('REX-2026-00001', 'STATUS_CHANGE', 'james.w@resolvex.com', '{"from": "OPEN", "to": "ASSIGNED", "method": "auto"}'::text, NOW() - INTERVAL '5 days'),
    ('REX-2026-00001', 'STATUS_CHANGE', 'james.w@resolvex.com', '{"from": "ASSIGNED", "to": "IN_PROGRESS", "method": "manual"}'::text, NOW() - INTERVAL '4 days'),
    ('REX-2026-00001', 'COMMENT', 'alice.m@email.com', '{"type": "customer_reply", "word_count": 28}'::text, NOW() - INTERVAL '3 days'),
    ('REX-2026-00004', 'STATUS_CHANGE', 'priya.p@resolvex.com', '{"from": "OPEN", "to": "ASSIGNED", "method": "auto"}'::text, NOW() - INTERVAL '7 days'),
    ('REX-2026-00004', 'RESOLUTION', 'priya.p@resolvex.com', '{"resolution": "Service restarted", "downtime_minutes": 245}'::text, NOW() - INTERVAL '6 days' + INTERVAL '4 hours'),
    ('REX-2026-00007', 'STATUS_CHANGE', 'james.w@resolvex.com', '{"from": "OPEN", "to": "ASSIGNED", "method": "system"}'::text, NOW() - INTERVAL '15 days'),
    ('REX-2026-00007', 'RESOLUTION', 'james.w@resolvex.com', '{"resolution": "Blocked attacker IP", "threat_level": "medium"}'::text, NOW() - INTERVAL '14 days'),
    ('REX-2026-00009', 'ESCALATION', 'emily.r@resolvex.com', '{"from_team": "L1", "to_team": "L2", "reason": "hardware"}'::text, NOW() - INTERVAL '7 days'),
    ('REX-2026-00009', 'ASSIGNMENT', 'marcus.j@resolvex.com', '{"from": null, "to": "Marcus", "source": "lead"}'::text, NOW() - INTERVAL '7 days'),
    ('REX-2026-00012', 'STATUS_CHANGE', 'emily.r@resolvex.com', '{"from": "OPEN", "to": "ASSIGNED", "method": "auto"}'::text, NOW() - INTERVAL '20 days'),
    ('REX-2026-00012', 'RESOLUTION', 'emily.r@resolvex.com', '{"resolution": "Fixed SMTP typo"}'::text, NOW() - INTERVAL '19 days'),
    ('REX-2026-00016', 'STATUS_CHANGE', 'olivia.t@resolvex.com', '{"from": "ASSIGNED", "to": "REOPENED", "reason": "recurrence"}'::text, NOW() - INTERVAL '24 days'),
    ('REX-2026-00020', 'ASSIGNMENT', 'alex.kim@resolvex.com', '{"from": null, "to": "Alex", "method": "auto"}'::text, NOW() - INTERVAL '30 days'),
    ('REX-2026-00020', 'STATUS_CHANGE', 'alex.kim@resolvex.com', '{"from": "ASSIGNED", "to": "IN_PROGRESS"}'::text, NOW() - INTERVAL '30 days'),
    ('REX-2026-00020', 'RESOLUTION', 'alex.kim@resolvex.com', '{"resolution": "Sync restarted, deadlock resolved"}'::text, NOW() - INTERVAL '29 days'),
    ('REX-2026-00004', 'ATTACHMENT', 'priya.p@resolvex.com', '{"file_count": 1, "type": "screenshot"}'::text, NOW() - INTERVAL '6 days'),
    ('REX-2026-00003', 'STATUS_CHANGE', 'alex.kim@resolvex.com', '{"from": "ASSIGNED", "to": "ESCALATED"}'::text, NOW() - INTERVAL '2 days'),
    ('REX-2026-00007', 'STATUS_CHANGE', 'sarah.chen@resolvex.com', '{"from": "RESOLVED", "to": "CLOSED"}'::text, NOW() - INTERVAL '13 days' + INTERVAL '8 hours'),
    ('REX-2026-00011', 'STATUS_CHANGE', 'david.b@resolvex.com', '{"from": "OPEN", "to": "ASSIGNED", "method": "admin"}'::text, NOW() - INTERVAL '12 hours'),
    ('REX-2026-00006', 'STATUS_CHANGE', 'david.b@resolvex.com', '{"from": "ASSIGNED", "to": "IN_PROGRESS"}'::text, NOW() - INTERVAL '3 days')
  ) AS v(ticket_val, event_val, actor_email, event_data, created_val);

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- =============================================================================
-- Total: 20+ INSERT queries per core table across 22 tables
-- =============================================================================
