INSERT INTO "AttendanceSession" (id, "tenantId", "sectionId", date, "takenBy", source, "createdAt")
SELECT 'as_t03_uat', t.id, ss.id, date('now'), 'seed-uat', 'teacher-web', CURRENT_TIMESTAMP
FROM "Tenant" t
JOIN "SectionSubject" ss ON ss."tenantId" = t.id
WHERE t.slug = 'school-demo'
LIMIT 1
ON CONFLICT ("tenantId","sectionId",date) DO UPDATE SET "takenBy"='seed-uat', source='teacher-web';

INSERT INTO "AttendanceRecord" (id, "tenantId", "attendanceSessionId", "studentId", status, "createdAt")
SELECT
  'ar_t03_uat_' || ROW_NUMBER() OVER (),
  t.id,
  (SELECT id FROM "AttendanceSession" s WHERE s."tenantId" = t.id AND s."sectionId" = ss.id AND s.date = date('now') LIMIT 1),
  e."studentId",
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 'present' ELSE 'late' END,
  CURRENT_TIMESTAMP
FROM "Tenant" t
JOIN "SectionSubject" ss ON ss."tenantId" = t.id
JOIN "Enrollment" e ON e."tenantId" = t.id AND e."sectionId" = ss.id AND e.status='active'
WHERE t.slug='school-demo'
LIMIT 5
ON CONFLICT ("tenantId","attendanceSessionId","studentId") DO UPDATE SET status=excluded.status;