-- Prevent concurrent registration requests from creating duplicate tenants/departments.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_lower
  ON public.organizations (lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_org_name_lower
  ON public.departments (org_id, lower(name));
