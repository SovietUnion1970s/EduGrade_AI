---
trigger: always_on
---

# API SPEC — EduGrade AI
Base URL: https://api.edugrade.vn/v1 | Timezone: UTC (DB/API) | Encoding: UTF-8
Auth: Authorization: Bearer {access_token} (15m) / Refresh (30d) | Real-time: SSE
Format Success: { data: T, meta?: { page, perPage, total } }
Format Error: { error: { code: string, message: string, details?: Record<string, unknown> } }

// Error Codes
type ErrorCode = 'UNAUTHORIZED'|'FORBIDDEN'|'NOT_FOUND'|'VALIDATION_ERROR'|'ASSIGNMENT_NOT_PUBLISHED'|'ASSIGNMENT_CLOSED'|'ASSIGNMENT_NOT_STARTED'|'SUBMISSION_ALREADY_SUBMITTED'|'SUBMISSION_NOT_FOUND'|'STUDENT_NOT_IN_CLASS'|'OCR_CONFIDENCE_TOO_LOW'|'OCR_SERVICE_UNAVAILABLE'|'INVALID_JOIN_CODE'|'ALREADY_IN_CLASS'|'CSV_PARSE_ERROR'|'CSV_ENCODING_ERROR'|'AI_GRADING_FAILED'|'AI_INSTRUCTION_INVALID'|'QUOTA_STUDENTS_EXCEEDED'|'QUOTA_AI_CREDITS_EXCEEDED'|'RATE_LIMIT_EXCEEDED'|'APPEAL_DEADLINE_PASSED'|'APPEAL_ALREADY_EXISTS';

Rate Limits: Auth (10 req/m/IP) | Submit (5 req/m/student) | Uploads (20 req/m/user) | Export (10 req/m/user) | Khác (120 req/m/user). Over limit trả về HTTP 429 kèm Retry-After.

// ENDPOINTS
// Auth
POST /v1/auth/register (Body: { email, password, fullName, role: 'teacher'|'student', dateOfBirth? }) => { data: { user, accessToken, refreshToken } }
POST /v1/auth/login (Body: { email, password }) => { data: { user, accessToken, refreshToken, expiresIn: 900 } }
POST /v1/auth/refresh (Body: { refreshToken }) => { data: { accessToken, expiresIn: 900 } }
POST /v1/auth/logout (Auth: Bearer) => { data: { success: true } }
POST /v1/auth/forgot-password (Body: { email }) => { data: { message: string } }
POST /v1/auth/reset-password (Body: { token, newPassword })
GET /v1/auth/me (Auth: Bearer) => { data: User }

// Organizations (Auth: school_admin+)
GET /v1/organizations/:orgId => { data: Organization & { plan: SubscriptionPlan } }
PATCH /v1/organizations/:orgId (Body: { name?, aiInstructionDefault? })
GET /v1/organizations/:orgId/users (Query: { role?, page?, perPage? })
POST /v1/organizations/:orgId/users (Body: { email, fullName, role: 'teacher'|'school_admin' })
DELETE /v1/organizations/:orgId/users/:userId
POST /v1/organizations/:orgId/import-students (Body: multipart/form-data { file }) => { data: { totalRows, imported, skipped, errors: Array<{ row, reason, value }> } }
GET /v1/organizations/:orgId/stats => { data: { totalStudents, totalTeachers, totalClasses, aiCreditsUsed, aiCreditsTotal } }
GET /v1/organizations/:orgId/quota => { data: { students: { used, total }, aiCredits: { used, total, resetAt }, classes: { used, total } } }

// Classes
GET /v1/classes (Auth: teacher+) => { data: Class[] }
POST /v1/classes (Auth: teacher+) (Body: { name, subject, gradeLevel }) => { data: Class }
GET /v1/classes/:classId (Auth: teacher+)
PATCH /v1/classes/:classId (Auth: teacher) (Body: { name?, subject?, gradeLevel? })
DELETE /v1/classes/:classId (Auth: teacher)
GET /v1/classes/:classId/students (Auth: teacher+)
DELETE /v1/classes/:classId/students/:studentId (Auth: teacher)
POST /v1/classes/join (Auth: student) (Body: { joinCode }) => { data: { class, message } }
GET /v1/classes/:classId/dashboard (Auth: teacher+) (Query: { assignmentId? }) => { data: { totalStudents, submittedCount, averageScore, scoreDistribution: Array<{ range, count }>, topWrongQuestions: Array<{ question, wrongCount, wrongPercent }>, studentsBelow: Array<{ student, score }> } }
GET /v1/classes/:classId/export (Auth: teacher+) (Query: { assignmentId, format: 'xlsx'|'pdf' }) => File

// Assignments
GET /v1/classes/:classId/assignments (Auth: teacher|student) (Query: { status? })
POST /v1/classes/:classId/assignments (Auth: teacher) (Body: { title, description?, timeLimitMinutes?, randomizeQuestions?, randomizeChoices?, antiCheatingEnabled?, allowOcrUpload?, showAnswerAfter: 'never'|'after_submit'|'after_deadline', availableFrom?, deadline?, gradingStyle, aiGradingInstruction? })
GET /v1/assignments/:assignmentId (Auth: teacher|student)
PATCH /v1/assignments/:assignmentId (Auth: teacher, chỉ DRAFT)
DELETE /v1/assignments/:assignmentId (Auth: teacher, chỉ DRAFT)
POST /v1/assignments/:assignmentId/publish (Auth: teacher)
POST /v1/assignments/:assignmentId/close (Auth: teacher)

// Questions (Auth: teacher | student khi đề mở)
GET /v1/assignments/:assignmentId/questions
POST /v1/assignments/:assignmentId/questions (Auth: teacher) (Body: { type, content, choices?: Array<{ id, text, isCorrect }>, correctAnswer?, sampleAnswer?, maxScore, rubricItems?: Array<{ description, keywords: string[], score, isRequired? }> })
PUT /v1/assignments/:assignmentId/questions/:questionId (Auth: teacher)
DELETE /v1/assignments/:assignmentId/questions/:questionId (Auth: teacher)
POST /v1/assignments/:assignmentId/questions/reorder (Auth: teacher) (Body: { questionIds: string[] })

// Prompt Manager (Auth: teacher)
GET /v1/assignments/:assignmentId/prompt => { data: { instruction, gradingStyle, template } }
PATCH /v1/assignments/:assignmentId/prompt (Body: { instruction?, gradingStyle? })
POST /v1/assignments/:assignmentId/prompt/import (Body: multipart/form-data { file: .md })
GET /v1/assignments/:assignmentId/prompt/export => File .md
GET /v1/assignments/:assignmentId/anti-cheat-report => { data: Array<{ student, submission, antiCheatLog, riskLevel: 'low'|'medium'|'high' }> }

// Submissions
POST /v1/assignments/:assignmentId/submissions (Auth: student) => { data: Submission & { questions: Question[] } }
PATCH /v1/submissions/:submissionId/answers (Auth: student) (Body: { answers: Array<{ questionId, answerText?, answerFileUrl? }> }) => { data: { savedAt } }
POST /v1/submissions/:submissionId/submit (Auth: student) (Body: { answers: Array<{ questionId, answerText?, answerFileUrl? }> }) => { data: { submissionId, message } }
GET /v1/submissions/:submissionId/status (Auth: student|teacher) => SSE Event (grading_started | grading_progress | grading_complete | grading_failed)
GET /v1/submissions/:submissionId (Auth: student|teacher)
GET /v1/assignments/:assignmentId/submissions (Auth: teacher) (Query: { status?, sort?, page? }) => { data: Array<{ submission, student, grade, minConfidence }> }

// Grades
GET /v1/grades/:gradeId (Auth: student|teacher) => { data: { grade, breakdowns: Array<GradeBreakdown & { rubricItem?, question }>, revisions, appeals } }
PATCH /v1/grades/:gradeId (Auth: teacher) (Body: { overrides?: Array<{ breakdownId, scoreAwarded, teacherComment }>, overallComment?, reason: string })
POST /v1/grades/:gradeId/approve (Auth: teacher) => { data: { grade, message } }
POST /v1/grades/:gradeId/publish (Auth: teacher) => { data: { publishedAt } }
GET /v1/grades/:gradeId/revisions (Auth: teacher+)
POST /v1/grades/:gradeId/appeals (Auth: student) (Body: { questionId?, reason: string (min 20 ký tự) })
GET /v1/grades/:gradeId/appeals (Auth: student|teacher)
PATCH /v1/appeals/:appealId (Auth: teacher) (Body: { status: 'resolved_approved'|'resolved_rejected', teacherResponse })

// Uploads & OCR
POST /v1/uploads/image (Auth: student) (Body: multipart/form-data { file }) => { data: { uploadId, fileUrl, ocrText, ocrConfidence, warning? } }
POST /v1/uploads/document (Auth: student) (Body: multipart/form-data { file }) => { data: { uploadId, extractedText, pageCount } }
POST /v1/uploads/:uploadId/confirm-ocr (Auth: student) (Body: { confirmedText })

// Notifications
GET /v1/notifications (Query: { isRead?, page?, perPage? }) => { data: Notification[], meta: { unreadCount } }
PATCH /v1/notifications/:notificationId/read
PATCH /v1/notifications/read-all
GET /v1/notifications/preferences => { data: { email, inapp, zalo } }
PATCH /v1/notifications/preferences (Body: { email?, zalo? })

// tRPC Router Structure
// server/trpc/routers/index.ts: appRouter = router({ auth, organization, class, assignment, submission, grade, upload, notification })