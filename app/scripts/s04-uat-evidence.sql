-- S04 UAT Evidence Query
-- Validates both admin enrollment and teacher attendance traces produced by s04-e2e-demo.ts.

.mode column
.headers on

WITH tenant_scope AS (
  SELECT id AS tenant_id
  FROM Tenant
  WHERE slug = 'school-demo'
),
latest_demo_student AS (
  SELECT s.id AS student_id, s.studentCode, s.firstName, s.lastName
  FROM Student s
  JOIN tenant_scope t ON t.tenant_id = s.tenantId
  WHERE s.studentCode LIKE 'S04E2E-%'
  ORDER BY s.createdAt DESC
  LIMIT 1
),
active_year AS (
  SELECT ay.id AS academic_year_id
  FROM AcademicYear ay
  JOIN tenant_scope t ON t.tenant_id = ay.tenantId
  WHERE ay.isActive = 1
  ORDER BY ay.createdAt DESC
  LIMIT 1
),
admin_enrollment AS (
  SELECT e.id AS enrollment_id, e.status, e.sectionId
  FROM Enrollment e
  JOIN tenant_scope t ON t.tenant_id = e.tenantId
  JOIN latest_demo_student ds ON ds.student_id = e.studentId
  JOIN active_year ay ON ay.academic_year_id = e.academicYearId
  LIMIT 1
),
teacher_attendance AS (
  SELECT ar.id AS attendance_record_id,
         ar.status AS attendance_status,
         ar.note,
         sess.id AS attendance_session_id,
         DATE(sess.date) AS attendance_date,
         sess.sectionId
  FROM AttendanceRecord ar
  JOIN AttendanceSession sess ON sess.id = ar.attendanceSessionId
  JOIN tenant_scope t ON t.tenant_id = ar.tenantId
  JOIN latest_demo_student ds ON ds.student_id = ar.studentId
  ORDER BY sess.date DESC, ar.createdAt DESC
  LIMIT 1
)
SELECT
  ds.studentCode,
  ds.firstName || ' ' || ds.lastName AS student_name,
  ae.enrollment_id,
  ae.status AS enrollment_status,
  ta.attendance_record_id,
  ta.attendance_status,
  ta.attendance_date,
  ta.note AS attendance_note,
  CASE WHEN ae.enrollment_id IS NOT NULL AND ae.status = 'enrolled' THEN 'OK' ELSE 'FAIL' END AS admin_assertion,
  CASE WHEN ta.attendance_record_id IS NOT NULL AND ta.attendance_status = 'present' THEN 'OK' ELSE 'FAIL' END AS teacher_assertion,
  CASE
    WHEN ae.enrollment_id IS NOT NULL AND ae.status = 'enrolled'
     AND ta.attendance_record_id IS NOT NULL AND ta.attendance_status = 'present'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS final_verdict
FROM latest_demo_student ds
LEFT JOIN admin_enrollment ae ON 1 = 1
LEFT JOIN teacher_attendance ta ON 1 = 1;
