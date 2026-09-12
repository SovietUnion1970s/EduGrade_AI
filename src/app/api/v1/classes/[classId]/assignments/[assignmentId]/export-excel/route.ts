import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(
  req: Request,
  { params }: { params: { classId: string; assignmentId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để xuất dữ liệu.' } },
        { status: 401 }
      );
    }

    const { classId, assignmentId } = params;

    // 1. Kiểm tra quyền của Giáo viên hoặc Quản trị viên
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId, classId },
      include: {
        class: {
          include: {
            teacher: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        questions: {
          orderBy: { orderIndex: 'asc' }
        },
        submissions: {
          include: {
            student: {
              select: { id: true, fullName: true, email: true }
            },
            grade: {
              include: {
                breakdowns: true
              }
            },
            answers: true
          },
          orderBy: {
            student: { fullName: 'asc' }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đề thi hoặc lớp học tương ứng.' } },
        { status: 404 }
      );
    }

    // Xác thực quyền giáo viên phụ trách lớp
    const userRole = (session.user as any).role;
    const isTeacherOfClass = assignment.class.teacherId === session.user.id;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && !isTeacherOfClass) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xuất báo cáo của lớp học này.' } },
        { status: 403 }
      );
    }

    // 2. Khởi tạo Workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduGrade AI Platform';
    workbook.lastModifiedBy = assignment.class.teacher.fullName || 'Giáo viên';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Bảng Điểm', {
      views: [{ showGridLines: true }]
    });

    // 3. Thiết lập thông tin tiêu đề chung (Header Info)
    worksheet.mergeCells('A1:J1');
    const headerTitleCell = worksheet.getCell('A1');
    headerTitleCell.value = 'BÁO CÁO KẾT QUẢ ĐÁNH GIÁ BÀI KIỂM TRA TỰ LUẬN';
    headerTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    headerTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Xanh đậm chuyên nghiệp
    };
    headerTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 36;

    // Thông tin chi tiết lớp & đề thi
    worksheet.getCell('A3').value = 'Trường / Đơn vị:';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('B3').value = 'Hệ thống Giáo dục Trực tuyến EduGrade AI';

    worksheet.getCell('E3').value = 'Lớp học:';
    worksheet.getCell('E3').font = { bold: true };
    worksheet.getCell('F3').value = `${assignment.class.name} (${assignment.class.gradeLevel})`;

    worksheet.getCell('A4').value = 'Bài kiểm tra:';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('B4').value = assignment.title;

    worksheet.getCell('E4').value = 'Môn học:';
    worksheet.getCell('E4').font = { bold: true };
    worksheet.getCell('F4').value = assignment.class.subject;

    worksheet.getCell('A5').value = 'Giáo viên bộ môn:';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('B5').value = `${assignment.class.teacher.fullName} (${assignment.class.teacher.email})`;

    worksheet.getCell('E5').value = 'Ngày xuất báo cáo:';
    worksheet.getCell('E5').font = { bold: true };
    worksheet.getCell('F5').value = new Date().toLocaleString('vi-VN');

    // 4. Xây dựng Cột Bảng Điểm Chi Tiết
    const baseColumns = [
      { header: 'STT', key: 'stt', width: 7 },
      { header: 'Họ và Tên Học Sinh', key: 'fullName', width: 26 },
      { header: 'Email / Tài Khoản', key: 'email', width: 26 },
      { header: 'Trạng Thái', key: 'statusText', width: 16 },
      { header: 'Điểm Tổng Kết', key: 'totalScore', width: 16 },
      { header: 'Xếp Loại', key: 'gradeRank', width: 16 },
    ];

    // Cột từng câu hỏi
    const questionColumns = assignment.questions.map((q, idx) => ({
      header: `Câu ${idx + 1} (${Number(q.maxScore)}đ)`,
      key: `question_${q.id}`,
      width: 14
    }));

    // Cột chống gian lận & lời phê
    const extraColumns = [
      { header: 'Số Lần Vi Phạm', key: 'violationCount', width: 16 },
      { header: 'Mức Độ Rủi Ro', key: 'riskLevel', width: 16 },
      { header: 'Nhận Xét Của AI & Giáo Viên', key: 'comments', width: 45 },
    ];

    const allColumns = [...baseColumns, ...questionColumns, ...extraColumns];

    // Dòng Header Bảng bắt đầu từ dòng 7
    const tableHeaderRowIndex = 7;
    const headerRow = worksheet.getRow(tableHeaderRowIndex);
    headerRow.height = 28;

    allColumns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' } // Blue 500
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      worksheet.getColumn(idx + 1).width = col.width;
    });

    // 5. Điền dữ liệu từng Học sinh
    let currentRowIndex = 8;
    let rankCounts = { Gioi: 0, Kha: 0, Dat: 0, ChuaDat: 0, ChuaNop: 0 };

    assignment.submissions.forEach((sub, subIdx) => {
      const dataRow = worksheet.getRow(currentRowIndex);
      dataRow.height = 24;

      const isSubmitted = sub.status !== 'IN_PROGRESS' && sub.submittedAt;
      const finalScore = sub.grade?.totalScore !== null && sub.grade?.totalScore !== undefined
        ? Number(sub.grade.totalScore)
        : (sub.grade?.aiTotalScore !== null && sub.grade?.aiTotalScore !== undefined ? Number(sub.grade.aiTotalScore) : null);

      // Xếp loại học lực
      let gradeRank = 'Chưa nộp';
      if (isSubmitted && finalScore !== null) {
        if (finalScore >= 8.0) {
          gradeRank = 'Giỏi';
          rankCounts.Gioi++;
        } else if (finalScore >= 6.5) {
          gradeRank = 'Khá';
          rankCounts.Kha++;
        } else if (finalScore >= 5.0) {
          gradeRank = 'Đạt (TB)';
          rankCounts.Dat++;
        } else {
          gradeRank = 'Chưa đạt';
          rankCounts.ChuaDat++;
        }
      } else {
        rankCounts.ChuaNop++;
      }

      // Xử lý nhật ký gian lận
      const antiCheatLogs = (sub.antiCheatLog as any[]) || [];
      const violationCount = antiCheatLogs.length;
      let riskLevel = 'An toàn';
      if (violationCount >= 5) riskLevel = 'Cao';
      else if (violationCount >= 2) riskLevel = 'Trung bình';

      // Ghép nhận xét
      const comments = [
        sub.grade?.overallComment ? `[GV]: ${sub.grade.overallComment}` : null,
        sub.grade?.aiOverallComment ? `[AI]: ${sub.grade.aiOverallComment}` : null
      ].filter(Boolean).join(' | ') || (isSubmitted ? 'Đã hoàn thành bài làm' : 'Đang làm bài...');

      // Ghi các cột cơ bản
      dataRow.getCell(1).value = subIdx + 1; // STT
      dataRow.getCell(2).value = sub.student.fullName;
      dataRow.getCell(3).value = sub.student.email;
      dataRow.getCell(4).value = isSubmitted ? 'Đã nộp bài' : 'Đang làm bài';
      dataRow.getCell(5).value = finalScore !== null ? finalScore : '-';
      dataRow.getCell(6).value = gradeRank;

      // Căn chỉnh
      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      // Tô màu điểm
      dataRow.getCell(5).font = {
        name: 'Arial',
        bold: true,
        size: 11,
        color: finalScore !== null && finalScore >= 8.0
          ? { argb: 'FF059669' } // Xanh lá
          : (finalScore !== null && finalScore < 5.0 ? { argb: 'FFDC2626' } : { argb: 'FF1E293B' })
      };

      // Ghi điểm từng câu hỏi
      let colOffset = 7;
      assignment.questions.forEach((q) => {
        const breakdown = sub.grade?.breakdowns.find(b => b.questionId === q.id);
        const qScore = breakdown ? Number(breakdown.scoreAwarded) : null;
        
        const qCell = dataRow.getCell(colOffset);
        qCell.value = qScore !== null ? qScore : (isSubmitted ? 0 : '-');
        qCell.alignment = { horizontal: 'center', vertical: 'middle' };
        colOffset++;
      });

      // Ghi các cột vi phạm & nhận xét
      const violCell = dataRow.getCell(colOffset++);
      violCell.value = violationCount;
      violCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const riskCell = dataRow.getCell(colOffset++);
      riskCell.value = riskLevel;
      riskCell.alignment = { horizontal: 'center', vertical: 'middle' };
      riskCell.font = {
        bold: true,
        color: riskLevel === 'Cao' ? { argb: 'FFDC2626' } : (riskLevel === 'Trung bình' ? { argb: 'FFD97706' } : { argb: 'FF059669' })
      };

      const commentCell = dataRow.getCell(colOffset++);
      commentCell.value = comments;
      commentCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Kẻ viền ô & sọc ngựa vằn
      const isEvenRow = subIdx % 2 === 0;
      for (let c = 1; c < colOffset; c++) {
        const cell = dataRow.getCell(c);
        if (isEvenRow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      currentRowIndex++;
    });

    // 6. Bảng thống kê tóm tắt ở cuối
    currentRowIndex += 2;
    worksheet.getCell(`A${currentRowIndex}`).value = 'THỐNG KÊ KẾT QUẢ HỌC LỰC:';
    worksheet.getCell(`A${currentRowIndex}`).font = { bold: true };

    worksheet.getCell(`A${currentRowIndex + 1}`).value = `• Giỏi (>= 8.0đ): ${rankCounts.Gioi} học sinh`;
    worksheet.getCell(`A${currentRowIndex + 2}`).value = `• Khá (6.5 - 7.9đ): ${rankCounts.Kha} học sinh`;
    worksheet.getCell(`A${currentRowIndex + 3}`).value = `• Đạt (5.0 - 6.4đ): ${rankCounts.Dat} học sinh`;
    worksheet.getCell(`A${currentRowIndex + 4}`).value = `• Chưa đạt (< 5.0đ): ${rankCounts.ChuaDat} học sinh`;
    worksheet.getCell(`A${currentRowIndex + 5}`).value = `• Đang làm / Chưa nộp: ${rankCounts.ChuaNop} học sinh`;

    // 7. Xuất file Buffer và gửi về Client
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Tạo tên file an toàn
    const safeTitle = assignment.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const safeClass = assignment.class.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `BangDiem_${safeClass}_${safeTitle}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi xuất bảng điểm Excel:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Không thể tạo file Excel: ' + error.message } },
      { status: 500 }
    );
  }
}
