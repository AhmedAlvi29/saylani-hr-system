import PDFDocument from 'pdfkit';
import { IPayslip } from '../models/Payslip';
import { IEmployee } from '../models/Employee';
import { Company } from '../models/Company';

export const generatePayslipPdfBuffer = async (
  payslip: any,
  employee: any
): Promise<Buffer> => {
  const company = await Company.findOne();
  const companyName = company?.name || 'Saylani HCM Organization';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Header section
    doc
      .fillColor('#1E293B')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(companyName, 40, 40)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748B')
      .text('OFFICIAL MONTHLY SALARY PAYSLIP', 40, 68)
      .text(`Generated: ${new Date().toLocaleDateString('en-PK')}`, 40, 82);

    // Pay period badge
    doc
      .rect(400, 40, 155, 45)
      .fillAndStroke('#EEF2FF', '#6366F1')
      .fillColor('#4338CA')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`PERIOD: ${payslip.month}`, 415, 50)
      .fontSize(9)
      .font('Helvetica')
      .text(`Status: ${payslip.isLocked ? 'FINALIZED' : 'DRAFT'}`, 415, 68);

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 105).lineTo(555, 105).stroke();

    // Employee & Job Information Card
    doc.rect(40, 115, 515, 75).fillAndStroke('#F8FAFC', '#E2E8F0');

    doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold');
    doc.text('Employee Name:', 55, 128);
    doc.font('Helvetica').text(`${employee.firstName} ${employee.lastName}`, 155, 128);

    doc.font('Helvetica-Bold').text('Employee Code:', 55, 146);
    doc.font('Helvetica').text(employee.employeeCode || 'N/A', 155, 146);

    doc.font('Helvetica-Bold').text('Department:', 55, 164);
    doc.font('Helvetica').text(employee.departmentId?.name || 'N/A', 155, 164);

    doc.font('Helvetica-Bold').text('Designation:', 320, 128);
    doc.font('Helvetica').text(employee.designationId?.title || 'Team Member', 410, 128);

    doc.font('Helvetica-Bold').text('Working Days:', 320, 146);
    doc.font('Helvetica').text(`${payslip.workingDays} days`, 410, 146);

    doc.font('Helvetica-Bold').text('Days Attended:', 320, 164);
    doc.font('Helvetica').text(`${payslip.presentDays} days`, 410, 164);

    // Table Header
    let y = 205;
    doc.rect(40, y, 250, 24).fill('#EEF2FF');
    doc.rect(305, y, 250, 24).fill('#EEF2FF');

    doc.fillColor('#3730A3').fontSize(10).font('Helvetica-Bold');
    doc.text('EARNINGS & ALLOWANCES', 50, y + 7);
    doc.text('AMOUNT (PKR)', 200, y + 7);
    doc.text('DEDUCTIONS & TAX', 315, y + 7);
    doc.text('AMOUNT (PKR)', 465, y + 7);

    // Table Rows
    y += 28;
    const drawRow = (label1: string, val1: number, label2: string, val2: number) => {
      doc.fillColor('#1E293B').font('Helvetica').fontSize(9);
      doc.text(label1, 50, y);
      doc.text(val1.toLocaleString(), 200, y);

      doc.text(label2, 315, y);
      doc.text(val2.toLocaleString(), 465, y);
      y += 18;
    };

    drawRow('Basic Salary', payslip.basicSalary, `Absent Days (${payslip.absentDays}d)`, payslip.absentDeduction);
    drawRow('House Rent Allowance (HRA 40%)', payslip.hra, `Unpaid Leave (${payslip.unpaidLeaveDays}d)`, payslip.unpaidDeduction);
    drawRow('Medical Allowance (10%)', payslip.medicalAllowance, `Half Days (${payslip.halfDays})`, payslip.halfDayDeduction);
    drawRow('Prorated Gross Adjustment', payslip.proratedGross - payslip.grossSalary, `Late Penalty (${payslip.latePenaltyDays}d)`, payslip.lateDeduction);
    drawRow('', 0, 'Income Tax (Govt Slabs)', payslip.monthlyTax);

    y += 10;
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
    y += 10;

    // Totals line
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(10);
    doc.text('Total Gross Earnings:', 50, y);
    doc.text(`PKR ${payslip.proratedGross.toLocaleString()}`, 180, y);

    doc.text('Total Deductions & Tax:', 315, y);
    doc.text(`PKR ${(payslip.totalDeductions + payslip.monthlyTax).toLocaleString()}`, 450, y);

    // Net Salary Box
    y += 35;
    doc
      .rect(40, y, 515, 60)
      .fillAndStroke('#F0FDF4', '#22C55E')
      .fillColor('#15803D')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('NET SALARY PAYABLE:', 60, y + 20)
      .fontSize(18)
      .text(`PKR ${payslip.netSalary.toLocaleString()}`, 330, y + 18);

    // Footer & Disclaimer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#94A3B8')
      .text(
        'This is a computer-generated document and does not require a physical signature. Confidential & proprietary to Saylani HCM.',
        40,
        740,
        { align: 'center', width: 515 }
      );

    doc.end();
  });
};
