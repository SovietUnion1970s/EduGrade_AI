# PROJECT CONTEXT — EduGrade AI
> Paste file này vào đầu mỗi session Cursor / Claude Code để AI hiểu toàn bộ dự án.

---

## 1. DỰ ÁN LÀ GÌ

EduGrade AI là nền tảng **chấm bài tự động bằng AI** cho giáo dục K-12 Việt Nam.

- Giáo viên tạo đề → Học sinh làm bài → AI chấm tự động (kể cả tự luận) → Giáo viên duyệt → Học sinh nhận kết quả
- Điểm khác biệt: AI chấm được **câu tự luận tiếng Việt** bằng Rubric Engine + Semantic NLP
- Chấm hoàn toàn **async** — học sinh nộp bài → nhận "Đã nhận bài" ngay → AI xử lý ngầm

---

## 2. TECH STACK

```
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend:    Next.js API Routes + tRPC
ORM:        Prisma
Database:   PostgreSQL (Supabase)
Auth:       NextAuth.js v5
Queue:      BullMQ + Redis (AI grading jobs — KHÔNG được xử lý sync)
SSE:        Next.js Route Handlers (EventSource — push grading status về client)
AI:         OpenAI GPT-4o (primary) + Gemini 1.5 Pro (backup)
OCR:        Google Cloud Vision API
Storage:    Cloudflare R2
Email:      Resend
Zalo:       Zalo OA SDK
Deploy:     Vercel + Railway (BullMQ workers)
```

---

## 3. CẤU TRÚC THƯ MỤC

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # login, register, forgot-password
│   ├── (dashboard)/
│   │   ├── teacher/            # dashboard giáo viên
│   │   │   ├── classes/
│   │   │   ├── assignments/
│   │   │   ├── review/         # review queue chấm bài
│   │   │   └── reports/
│   │   ├── student/            # dashboard học sinh
│   │   │   ├── exams/          # danh sách bài thi
│   │   │   ├── results/        # kết quả
│   │   │   └── progress/       # tiến độ
│   │   └── admin/              # school admin + super admin
│   └── api/
│       ├── trpc/               # tRPC handler
│       ├── auth/               # NextAuth
│       ├── uploads/            # OCR + file upload
│       └── submissions/[id]/status/  # SSE endpoint
├── server/
│   ├── trpc/
│   │   ├── routers/            # auth, class, assignment, submission, grade...
│   │   └── middleware/         # auth check, org isolation, rate limit
│   ├── db/
│   │   └── schema.prisma
│   ├── queue/
│   │   ├── workers/
│   │   │   ├── grading.worker.ts     # BullMQ worker xử lý AI grading
│   │   │   └── notification.worker.ts
│   │   └── jobs/
│   │       └── grading.job.ts
│   └── services/
│       ├── ai/
│       │   ├── rubric-grader.ts      # Lớp 1: chấm từng ý rubric
│       │   ├── semantic-grader.ts    # Lớp 2: đánh giá diễn đạt tổng thể
│       │   └── prompt-builder.ts     # Build prompt từ instruction + rubric
│       ├── ocr.service.ts
│       ├── notification.service.ts
│       └── plagiarism.service.ts
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── teacher/
│   ├── student/
│   └── shared/
├── lib/
│   ├── auth.ts
│   ├── db.ts                   # Prisma client singleton
│   ├── redis.ts                # Redis client singleton
│   ├── queue.ts                # BullMQ queue definitions
│   └── validators/             # Zod schemas
└── types/
    └── index.ts
```

---

## 4. BỐN VAI TRÒ & QUYỀN HẠN

| Role | Enum value | Có thể làm |
|---|---|---|
| Super Admin | `super_admin` | Quản lý toàn platform, tất cả orgs |
| Admin Trường | `school_admin` | Quản lý giáo viên, import HS, báo cáo trường |
| Giáo viên | `teacher` | Tạo đề, chấm bài, quản lý lớp mình |
| Học sinh | `student` | Làm bài, xem kết quả của mình |

**Rule quan trọng về phân quyền:**
- Mọi query đến DB phải có `where: { orgId: session.user.orgId }` — không bao giờ query cross-org
- Giáo viên chỉ thấy lớp của mình (`where: { teacherId: session.user.id }`)
- Học sinh chỉ thấy bài làm của mình (`where: { studentId: session.user.id }`)

---

## 5. LUỒNG NGHIỆP VỤ QUAN TRỌNG NHẤT

### Luồng chấm bài (ASYNC — bắt buộc)
```
1. POST /submissions/:id/submit
   → Lưu submission vào DB (status: 'submitted')
   → Return 200 "Đã nhận bài" NGAY (không đợi AI)
   → Đẩy job vào BullMQ queue

2. BullMQ worker (background):
   → Lấy submission + rubric từ DB
   → Gọi AI (rubric grader + semantic grader)
   → Retry tối đa 3 lần nếu fail (immediate → +5s → +20s)
   → Lưu kết quả vào grades + grade_breakdowns
   → Update submission.status = 'graded'
   → Push SSE event về client

3. Client nhận SSE event:
   → Hiển thị kết quả HOẶC "Đang chờ giáo viên duyệt"
```

### Luồng review (Giáo viên)
```
Review Queue → xem bài (multi-pane) → approve / override → publish → notify học sinh
```

---

## 6. CÁC QUY TẮC BẮT BUỘC KHI CODE

1. **KHÔNG BAO GIỜ** xử lý AI grading synchronous trong API route — luôn dùng BullMQ
2. **KHÔNG BAO GIỜ** query DB mà không có `orgId` filter (trừ super_admin)
3. **KHÔNG BAO GIỜ** hardcode API key — luôn đọc từ `process.env`
4. **KHÔNG BAO GIỜ** để lẫn tiếng Anh trong UI text — toàn bộ dùng tiếng Việt
5. Mọi mutation phải có **audit trail** (ghi vào `grade_revisions` hoặc log)
6. Mọi error response phải theo format: `{ error: { code, message, details } }`
7. Message tiếng Việt, cụ thể, có hướng giải quyết — không dùng "Something went wrong"

---

## 7. ENTITY QUAN HỆ (tóm tắt)

```
Organization → User (many)
Organization → Class (many)
Class → ClassMembership → User/Student (many-to-many)
Class → Assignment (many)
Assignment → Question (many)
Question → RubricItem (many)           ← chỉ cho câu tự luận
Assignment → Submission (many)
Submission → SubmissionAnswer (many)   ← 1 answer per question
Submission → Grade (one-to-one)
Grade → GradeBreakdown (many)          ← 1 breakdown per rubric item
Grade → GradeRevision (many)           ← audit trail
Grade → GradeAppeal (many)             ← khiếu nại
User → Notification (many)
```

---

## 8. TRẠNG THÁI (STATE MACHINES)

### Submission status
```
in_progress → submitted → grading → graded
                                  ↘ invalidated  (anti-cheat)
```

### Grade status
```
ai_draft → pending_review → approved
                          ↘ overridden   (giáo viên chỉnh điểm)
```

### Assignment status
```
draft → published → closed → archived
```

### Appeal status
```
pending → reviewing → resolved_approved
                    ↘ resolved_rejected
```

---

## 9. CONFIDENCE LEVEL (AI grading)

| Level | Ý nghĩa | Workflow tiếp theo |
|---|---|---|
| `high` | AI chắc chắn | Có thể auto-approve (tùy cài đặt giáo viên) |
| `medium` | AI không chắc | Đưa vào review queue, giáo viên xem |
| `low` | AI không tự tin | Bắt buộc giáo viên duyệt, ưu tiên đầu queue |

---

## 10. BIẾN MÔI TRƯỜNG CẦN CÓ

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
OPENAI_API_KEY=
GEMINI_API_KEY=
GOOGLE_CLOUD_VISION_KEY=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
RESEND_API_KEY=
ZALO_OA_ACCESS_TOKEN=
REDIS_URL=
NEXT_PUBLIC_APP_URL=
```
