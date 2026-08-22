# CODING RULES — EduGrade AI
> Paste file này vào `.cursorrules` hoặc system prompt của Cursor / Claude Code.
> AI sẽ tự động follow tất cả conventions này khi viết code.

---

## Tôi là AI assistant đang làm việc trên dự án EduGrade AI.

**Dự án:** Nền tảng chấm bài tự động bằng AI cho giáo dục K-12 Việt Nam.
**Stack:** Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + BullMQ + tRPC + Tailwind + shadcn/ui.

---

## RULES BẮT BUỘC (KHÔNG ĐƯỢC VI PHẠM)

### 1. ASYNC AI GRADING — QUAN TRỌNG NHẤT
```typescript
// ✅ ĐÚNG — Luôn dùng BullMQ queue
await gradingQueue.add('grade-submission', { submissionId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }
})
return { message: 'Đã nhận bài! Đang chấm...' }

// ❌ SAI — Không bao giờ gọi AI trực tiếp trong API route
const result = await openai.chat.completions.create({ ... }) // KHÔNG
```

### 2. MULTI-TENANT DATA ISOLATION
```typescript
// ✅ ĐÚNG — Luôn có orgId filter
const classes = await prisma.class.findMany({
  where: { orgId: session.user.orgId }
})

// ❌ SAI — Query không có org filter
const classes = await prisma.class.findMany() // KHÔNG BAO GIỜ
```

### 3. KHÔNG HARDCODE API KEY
```typescript
// ✅ ĐÚNG
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ❌ SAI
const openai = new OpenAI({ apiKey: 'sk-abc123...' }) // KHÔNG
```

### 4. TOÀN BỘ UI TIẾNG VIỆT
```typescript
// ✅ ĐÚNG
throw new TRPCError({ message: 'Mã lớp không hợp lệ. Vui lòng kiểm tra lại với giáo viên.' })
toast.error('Không thể tải dữ liệu. Vui lòng thử lại.')

// ❌ SAI
throw new TRPCError({ message: 'Invalid join code' })
toast.error('Something went wrong')
```

### 5. ERROR RESPONSE FORMAT
```typescript
// ✅ ĐÚNG — tRPC error
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Bài này đã được nộp trước đó.',
  // details thêm vào cause nếu cần
})

// ✅ ĐÚNG — REST error
return NextResponse.json({
  error: {
    code: 'SUBMISSION_ALREADY_SUBMITTED',
    message: 'Bài này đã được nộp trước đó.',
    details: { submittedAt: submission.submittedAt }
  }
}, { status: 422 })
```

### 6. AUDIT TRAIL BẮT BUỘC
```typescript
// Bất kỳ khi nào thay đổi điểm → PHẢI ghi grade_revision
await prisma.gradeRevision.create({
  data: {
    gradeId,
    changedById: session.user.id,
    oldScore: previousScore,
    newScore: newScore,
    reason: input.reason  // bắt buộc, không được để trống
  }
})
```

### 7. KHÔNG DÙNG FLOAT CHO ĐIỂM
```typescript
// ✅ ĐÚNG — Decimal trong Prisma
maxScore: Decimal  @db.Decimal(5, 2)

// ❌ SAI — Float có lỗi làm tròn
maxScore: Float  // KHÔNG
```

---

## CODE CONVENTIONS

### TypeScript
```typescript
// Luôn dùng strict types — không dùng `any`
type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | 'GRADED' | 'INVALIDATED'

// Luôn dùng Zod để validate input
const submitSchema = z.object({
  submissionId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answerText: z.string().optional(),
    answerFileUrl: z.string().url().optional(),
  }))
})

// Không dùng `as` cast trừ khi thực sự cần
const user = data as User  // tránh — dùng proper typing thay
```

### Prisma
```typescript
// Luôn dùng select hoặc include cụ thể — không fetch toàn bộ
const submission = await prisma.submission.findFirst({
  where: { id, studentId: session.user.id },
  select: {
    id: true,
    status: true,
    grade: { select: { totalScore: true, publishedAt: true } }
  }
})

// Dùng transaction khi update nhiều bảng liên quan
await prisma.$transaction([
  prisma.grade.update({ where: { id: gradeId }, data: { status: 'APPROVED' } }),
  prisma.gradeRevision.create({ data: { ... } }),
  prisma.notification.create({ data: { ... } })
])
```

### tRPC
```typescript
// Dùng protectedProcedure cho tất cả routes cần auth
// Dùng teacherProcedure cho routes chỉ giáo viên
// Dùng studentProcedure cho routes chỉ học sinh

// Cấu trúc chuẩn của 1 procedure:
export const myRouter = router({
  create: teacherProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Validate ownership / permission
      // 2. Business logic
      // 3. DB mutation
      // 4. Audit trail nếu cần
      // 5. Trigger notification / job nếu cần
      // 6. Return data
    })
})
```

### Error Handling
```typescript
// Wrap external service calls trong try-catch với fallback
try {
  const result = await openai.chat.completions.create({ ... })
  return result
} catch (error) {
  // Log lỗi
  console.error('[AI Grading] OpenAI failed:', error)
  // Thử backup provider
  try {
    return await gemini.generateContent({ ... })
  } catch (backupError) {
    // Cả hai fail → throw để BullMQ retry
    throw new Error('AI_PROVIDER_UNAVAILABLE')
  }
}
```

### BullMQ Worker
```typescript
// Cấu trúc chuẩn của grading worker
const gradingWorker = new Worker('grading', async (job) => {
  const { submissionId } = job.data

  // 1. Lấy data
  const submission = await prisma.submission.findUnique({ ... })

  // 2. Update status
  await prisma.submission.update({ where: { id: submissionId }, data: { status: 'GRADING' } })

  // 3. Phân loại và chấm
  for (const answer of submission.answers) {
    if (isAutoGraded(answer.question.type)) {
      await gradeAutomatic(answer)
    } else {
      await gradeWithAI(answer, submission.assignment.aiGradingInstruction)
    }
  }

  // 4. Tổng hợp + lưu
  await saveGrade(submissionId, results)

  // 5. Push SSE notification
  await pushSSEEvent(submissionId, 'grading_complete', { ... })

}, {
  connection: redis,
  concurrency: 10  // xử lý 10 jobs song song
})

// Xử lý khi job fail
gradingWorker.on('failed', async (job, error) => {
  if (job.attemptsMade >= 3) {
    // Sau 3 lần fail → flag manual review
    await prisma.submission.update({
      where: { id: job.data.submissionId },
      data: { status: 'GRADED' }
    })
    await prisma.grade.update({
      where: { submissionId: job.data.submissionId },
      data: { status: 'AI_DRAFT', overallComment: 'AI không thể chấm, cần chấm thủ công.' }
    })
    await notifyTeacher(job.data.submissionId, 'AI_GRADING_FAILED')
  }
})
```

---

## UI CONVENTIONS

### Component naming
```
PascalCase cho components: `ReviewQueue`, `SubmissionCard`, `GradePanel`
camelCase cho hooks: `useSubmission`, `useGradeQueue`
kebab-case cho files: `review-queue.tsx`, `submission-card.tsx`
```

### Tailwind classes — Design tokens
```typescript
// Màu sắc — dùng đúng semantic
'text-blue-800'         // primary text, headings
'bg-white'              // card background
'bg-slate-50'           // page background

'text-green-600'        // ✓ đúng, approved
'text-red-600'          // ✗ sai, error
'text-amber-600'        // ⚠ cảnh báo, cần duyệt
'text-sky-500'          // ℹ thông tin

// Border radius
'rounded-lg'            // card (8px)
'rounded-md'            // button (6px)
'rounded'               // input (4px)

// Shadow
'shadow-sm'             // card nhẹ
```

### shadcn/ui — dùng đúng component
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'  // toast notifications

// Confidence level badge
const confidenceBadge = {
  HIGH: <Badge variant="default" className="bg-green-100 text-green-700">Cao</Badge>,
  MEDIUM: <Badge variant="default" className="bg-amber-100 text-amber-700">Trung bình</Badge>,
  LOW: <Badge variant="destructive">Thấp</Badge>,
}

// Submission status badge
const statusBadge = {
  IN_PROGRESS: <Badge variant="outline">Đang làm</Badge>,
  SUBMITTED: <Badge variant="secondary">Đã nộp</Badge>,
  GRADING: <Badge className="bg-blue-100 text-blue-700">Đang chấm</Badge>,
  GRADED: <Badge className="bg-green-100 text-green-700">Đã chấm</Badge>,
  INVALIDATED: <Badge variant="destructive">Vô hiệu</Badge>,
}
```

### Loading states — dùng skeleton, không dùng spinner toàn trang
```typescript
if (isLoading) return <SubmissionCardSkeleton />  // ✅
if (isLoading) return <div>Đang tải...</div>      // ❌ tránh
```

### Error states — inline, không dùng alert box
```typescript
// ✅ ĐÚNG
{error && (
  <p className="text-sm text-red-600 mt-1">
    {error.message}
  </p>
)}

// ❌ TRÁNH
alert(error.message)
```

---

## FILE STRUCTURE RULES

```
# Khi tạo feature mới (ví dụ: appeal system):
server/trpc/routers/grade.ts          → thêm appealRouter
server/services/appeal.service.ts     → business logic
components/student/AppealForm.tsx     → UI component
app/(dashboard)/student/results/[gradeId]/page.tsx → page

# Không tạo:
utils/helpers.ts      → quá chung chung, đặt vào service cụ thể
types/all-types.ts    → tách ra từng domain: types/grade.ts, types/submission.ts
```

---

## SECURITY CHECKLIST khi viết API

Trước khi hoàn thành bất kỳ API route/procedure nào, check:

- [ ] Có `session` check chưa? (protectedProcedure)
- [ ] Có `orgId` filter trong mọi DB query chưa?
- [ ] Có verify ownership không? (user chỉ truy cập data của mình)
- [ ] Input đã được validate bằng Zod chưa?
- [ ] Error message có để lộ thông tin nhạy cảm không?
- [ ] Nếu mutation → có audit trail không?
- [ ] Có rate limit nếu cần không?

---

## AI GRADING PROMPT — Khi viết prompt builder

```typescript
// Cấu trúc prompt chuẩn cho AI grading
function buildGradingPrompt(question: Question, rubricItems: RubricItem[], answerText: string, instruction: string) {
  return {
    system: `Bạn là trợ lý chấm bài cho giáo viên Việt Nam.
Nhiệm vụ: đọc bài làm → đối chiếu rubric → cho điểm khách quan → nhận xét bằng tiếng Việt.

QUAN TRỌNG:
- Học sinh diễn đạt KHÁC nhưng ĐÚNG nội dung → vẫn cho điểm
- Không trừ điểm lỗi chính tả trừ khi rubric yêu cầu
- Confidence = LOW nếu bài không rõ ràng để đánh giá
- LUÔN trả về JSON hợp lệ duy nhất, không thêm text khác`,

    user: `[PHONG CÁCH CHẤM]: ${instruction}

CÂU HỎI: ${question.content}
${question.sampleAnswer ? `ĐÁP ÁN MẪU: ${question.sampleAnswer}` : ''}

RUBRIC:
${rubricItems.map((item, i) => `
Ý ${i + 1}: ${item.description}
Điểm: ${item.score} | Bắt buộc: ${item.isRequired ? 'Có' : 'Không (điểm cộng)'}
Từ khóa: ${item.keywords.join(', ')}
`).join('')}

BÀI LÀM:
${answerText}

OUTPUT (JSON duy nhất):
{
  "rubricScores": [{ "rubricItemId": "uuid", "scoreAwarded": 0, "reasoning": "..." }],
  "overallScore": 0,
  "overallComment": "...",
  "improvementSuggestion": "...",
  "confidence": "high|medium|low",
  "confidenceReason": "..."
}`
  }
}
```

---

## GHI NHỚ KHI AI ĐANG CODE

1. **Trước khi viết bất kỳ API nào** → check: có orgId filter không?
2. **Trước khi gọi AI** → check: có dùng queue không? Không bao giờ sync.
3. **Trước khi trả về lỗi** → check: message có phải tiếng Việt không?
4. **Sau bất kỳ mutation điểm nào** → check: đã tạo grade_revision chưa?
5. **Mọi text người dùng thấy** → tiếng Việt, cụ thể, có hướng giải quyết.
