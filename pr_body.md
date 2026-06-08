## Summary

Major feature release covering all improvements from this development session.

### RBAC (Role-Based Access Control)
- Admin: full access to all modules
- Manager: clients, orders, calendar, warehouse, finance, analytics
- Receptionist: clients, orders, calendar
- Mechanic: own assigned orders only
- Navigation hides inaccessible sections per role
- All backend routes scoped by role

### Multi-tenancy (Companies with Invite Codes)
- Each auto service shop is an isolated company with its own data
- Registration flow: Create company (admin) or Join via 6-char invite code
- All data isolated by company_id
- Settings page: manage company name, invite code, members list
- Existing data migrated to default company DEMO01

### Work Tracking System
- Worker clicks "Start work" — sets started_at, live timer begins
- Live elapsed time counter (h:m:s) while order is in progress
- "Complete" — sets completed_at, calculates total duration
- "Force majeure" — requires mandatory photo + description
- All actions logged in work_logs table with photos
- New DB columns: started_at, completed_at, worker_notes

### Email Verification (actually works)
- Uses Ethereal SMTP (automatic test account, zero config needed)
- Registration sends real email; response includes previewUrl for immediate access
- User clicks link in email and is auto-logged in
- First user (company creator) auto-verified; workers must verify
- Production: set SMTP_HOST/SMTP_USER/SMTP_PASS env vars for real delivery

### Tablet Responsive Layout
- All tables wrapped in overflow-x-auto
- Grids use sm/md/lg breakpoints everywhere
- Page headers use flex-wrap so buttons wrap on narrow screens
- Sidebar hides below 1024px with hamburger menu

### Database Changes
- New tables: companies, work_logs
- New columns: users.company_id, email_verified, verify_token
- New columns: orders.started_at, completed_at, worker_notes
- All data tables have company_id
- SQLite migrations + PostgreSQL idempotent ALTER TABLE

## Deployment
Live at: https://autocrm-production-4dca.up.railway.app
PostgreSQL on Railway, pre-built client/dist committed to repo.

Generated with Claude Code
