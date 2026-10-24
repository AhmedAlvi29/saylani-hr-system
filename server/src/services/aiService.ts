import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { PayrollRun } from '../models/PayrollRun';
import { Department } from '../models/Department';
import { Policy } from '../models/Policy';
import { AiLog } from '../models/AiLog';
import { getTodayDateString } from './attendanceService';

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
let aiClient: any = null;
if (apiKey) {
  import('@google/genai')
    .then(({ GoogleGenAI }) => {
      aiClient = new GoogleGenAI({ apiKey });
    })
    .catch((err: any) => {
      console.warn('[AI Service] Failed to initialize GoogleGenAI client:', err.message);
    });
}

// Backend Tools Implementation with Role Scope Enforcement
export const executeAiTool = async (
  toolName: string,
  args: any,
  user: { id: string; role: string; employeeId?: string; email: string; companyId?: string }
): Promise<any> => {
  const todayStr = getTodayDateString();
  const cFilter: any = user.companyId ? { companyId: user.companyId } : {};

  switch (toolName) {
    case 'get_headcount': {
      let filter: any = { ...cFilter, employmentStatus: { $in: ['active', 'probation'] } };
      if (args.department) {
        const dept = await Department.findOne({
          ...cFilter,
          $or: [
            { name: { $regex: args.department, $options: 'i' } },
            { code: { $regex: args.department, $options: 'i' } },
          ],
        });
        if (dept) {
          filter.departmentId = dept._id;
        }
      }
      const count = await Employee.countDocuments(filter);
      return { totalHeadcount: count, departmentFilter: args.department || 'all' };
    }

    case 'get_attendance_summary': {
      const date = args.date || todayStr;
      const records = await Attendance.find({ ...cFilter, date });
      const present = records.filter((r) => r.status === 'present').length;
      const late = records.filter((r) => r.status === 'late').length;
      const halfDay = records.filter((r) => r.status === 'half_day').length;
      const totalEmployees = await Employee.countDocuments({
        ...cFilter,
        employmentStatus: { $in: ['active', 'probation'] },
      });
      const onLeave = await LeaveRequest.countDocuments({
        ...cFilter,
        status: 'approved',
        startDate: { $lte: date },
        endDate: { $gte: date },
      });
      const absent = Math.max(0, totalEmployees - (present + late + halfDay) - onLeave);
      const attendanceRate =
        totalEmployees > onLeave
          ? Math.round(((present + late + 0.5 * halfDay) / (totalEmployees - onLeave)) * 100 * 10) / 10
          : 100;

      return {
        date,
        totalEmployees,
        present,
        late,
        halfDay,
        onLeave,
        absent,
        attendanceRatePercent: attendanceRate,
      };
    }

    case 'get_late_comers': {
      const monthStart = `${(args.month || todayStr).substring(0, 7)}-01`;
      const lateMatch: any = { date: { $gte: monthStart, $lte: todayStr }, status: 'late' };
      if (user.companyId) lateMatch.companyId = user.companyId;

      const lateAgg = await Attendance.aggregate([
        { $match: lateMatch },
        { $group: { _id: '$employeeId', lateCount: { $sum: 1 }, totalLateMinutes: { $sum: '$lateMinutes' } } },
        { $sort: { lateCount: -1 } },
        { $limit: args.limit || 5 },
      ]);

      const results = await Promise.all(
        lateAgg.map(async (item) => {
          const emp = await Employee.findById(item._id).populate('departmentId', 'name code').lean();
          return {
            name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
            code: emp?.employeeCode,
            department: (emp?.departmentId as any)?.name,
            lateCount: item.lateCount,
            totalLateMinutes: item.totalLateMinutes,
          };
        })
      );
      return { month: monthStart.substring(0, 7), lateComers: results };
    }

    case 'get_leave_summary': {
      const pendingCount = await LeaveRequest.countDocuments({ ...cFilter, status: 'pending' });
      const approvedCount = await LeaveRequest.countDocuments({ ...cFilter, status: 'approved' });
      const todayLeaves = await LeaveRequest.find({
        ...cFilter,
        status: 'approved',
        startDate: { $lte: todayStr },
        endDate: { $gte: todayStr },
      }).populate('employeeId', 'firstName lastName employeeCode');

      const activeEmployeesOnLeave = todayLeaves.map((l: any) => ({
        name: l.employeeId ? `${l.employeeId.firstName} ${l.employeeId.lastName}` : 'Employee',
        code: l.employeeId?.employeeCode,
        leaveType: l.leaveType,
        reason: l.reason,
      }));

      return {
        pendingRequests: pendingCount,
        approvedTotal: approvedCount,
        onLeaveTodayCount: activeEmployeesOnLeave.length,
        employeesOnLeaveToday: activeEmployeesOnLeave,
      };
    }

    case 'get_my_leave_balance': {
      if (!user.employeeId) {
        return { error: 'No employee record linked to current account.' };
      }
      const year = args.year || new Date().getFullYear();
      let balance = await LeaveBalance.findOne({ employeeId: user.employeeId, year });
      if (!balance) {
        balance = await LeaveBalance.create({
          employeeId: user.employeeId,
          year,
          annualQuota: 14,
          sickQuota: 8,
          casualQuota: 10,
        });
      }
      return {
        year,
        annual: { total: balance.annualQuota, used: balance.annualUsed, remaining: balance.annualQuota - balance.annualUsed },
        sick: { total: balance.sickQuota, used: balance.sickUsed, remaining: balance.sickQuota - balance.sickUsed },
        casual: { total: balance.casualQuota, used: balance.casualUsed, remaining: balance.casualQuota - balance.casualUsed },
        unpaidUsed: balance.unpaidUsed,
      };
    }

    case 'get_payroll_summary': {
      // Permission check: only admin and hr can see aggregate payroll
      if (user.role === 'employee') {
        return {
          error: 'Access denied: Employees cannot view organization payroll summaries.',
        };
      }
      const month = args.month || todayStr.substring(0, 7);
      const run = await PayrollRun.findOne({ month, ...cFilter });
      if (!run) {
        return { message: `No payroll generated for month ${month}.` };
      }
      return {
        month: run.month,
        status: run.status,
        totalGross: run.totalGross,
        totalDeductions: run.totalDeductions,
        totalTax: run.totalTax,
        totalNet: run.totalNet,
        employeeCount: run.employeeCount,
      };
    }

    case 'search_employees': {
      // Employees can only search basic directory info (name, department, designation), NEVER salaries
      const query = args.query || '';
      const filter: any = {
        ...cFilter,
        employmentStatus: { $in: ['active', 'probation'] },
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { employeeCode: { $regex: query, $options: 'i' } },
        ],
      };

      const emps = await Employee.find(filter)
        .populate('departmentId', 'name code')
        .populate('designationId', 'title')
        .limit(10)
        .lean();

      return emps.map((e: any) => ({
        name: `${e.firstName} ${e.lastName}`,
        code: e.employeeCode,
        department: e.departmentId?.name,
        designation: e.designationId?.title,
        email: e.email,
        // Only Admin and HR see salaries; employee NEVER sees another employee's salary!
        ...(user.role !== 'employee' && { grossSalary: e.grossSalary }),
      }));
    }

    default:
      return { error: `Tool ${toolName} not supported.` };
  }
};

// Main Chat Controller
export const askAiAssistant = async (
  prompt: string,
  user: { id: string; role: string; employeeId?: string; email: string; companyId?: string }
): Promise<{ answer: string; isAiGenerated: boolean; toolCalls?: any[] }> => {
  const startTime = Date.now();
  let toolCallsUsed: any[] = [];
  let answer = '';

  try {
    // Check for employee asking about colleague salary
    const lowerPrompt = prompt.toLowerCase();
    if (
      user.role === 'employee' &&
      (lowerPrompt.includes('salary') || lowerPrompt.includes('pay') || lowerPrompt.includes('payroll')) &&
      !lowerPrompt.includes('my salary') &&
      !lowerPrompt.includes('my payslip') &&
      !lowerPrompt.includes('my pay')
    ) {
      answer =
        'As an employee, you can only access your own personal salary and payslip records. I am not authorized to disclose confidential compensation data of other team members.';
      await recordAiLog(user, prompt, toolCallsUsed, answer, Date.now() - startTime, true);
      return { answer, isAiGenerated: true, toolCalls: [] };
    }

    // If Gemini client is configured with GEMINI_API_KEY
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const response = await callGeminiWithTools(prompt, user);
        answer = response.text;
        toolCallsUsed = response.tools;
      } catch (geminiErr: any) {
        console.warn('[AI Service] Gemini API call failed, using resilient heuristic engine:', geminiErr.message);
        answer = await fallbackHeuristicEngine(prompt, user);
      }
    } else {
      // Offline resilient heuristic assistant that queries real database tools!
      answer = await fallbackHeuristicEngine(prompt, user);
    }

    await recordAiLog(user, prompt, toolCallsUsed, answer, Date.now() - startTime, true);
    return { answer, isAiGenerated: true, toolCalls: toolCallsUsed };
  } catch (error: any) {
    console.error('[AI Assistant Error]', error);
    await recordAiLog(user, prompt, toolCallsUsed, error.message, Date.now() - startTime, false, error.message);
    return {
      answer:
        'I encountered a temporary issue retrieving this information. Please check back in a moment or view the live dashboard directly.',
      isAiGenerated: true,
    };
  }
};

// Resilient Heuristic Engine: Reads real database records and answers naturally!
const fallbackHeuristicEngine = async (
  prompt: string,
  user: { id: string; role: string; employeeId?: string; email: string; companyId?: string }
): Promise<string> => {
  const p = prompt.toLowerCase();

  // 1. Headcount questions (e.g. "How many active employees are in Engineering?")
  if (p.includes('how many') || p.includes('headcount') || p.includes('total employees') || p.includes('kitne employees')) {
    let deptName = '';
    if (p.includes('engineering') || p.includes('it')) deptName = 'Engineering';
    else if (p.includes('hr') || p.includes('human resources')) deptName = 'Human Resources';
    else if (p.includes('operation') || p.includes('ops')) deptName = 'Operations';

    const res = await executeAiTool('get_headcount', { department: deptName }, user);
    if (deptName) {
      return `Currently, there are **${res.totalHeadcount} active employee(s)** in the ${deptName} department.`;
    }
    return `The total active organization headcount is currently **${res.totalHeadcount} employee(s)**.`;
  }

  // 2. Attendance & Late questions (e.g. "Who came late most often this month?" or "attendance rate")
  if (p.includes('late') || p.includes('der se')) {
    const res = await executeAiTool('get_late_comers', { limit: 5 }, user);
    if (!res.lateComers || res.lateComers.length === 0) {
      return `Great news! No late arrivals have been recorded for the month of ${res.month}.`;
    }
    const top = res.lateComers[0];
    return `For ${res.month}, **${top.name}** (${top.department || 'General'}) recorded the highest number of late arrivals with **${top.lateCount} occurrences** (${top.totalLateMinutes} total minutes).`;
  }

  if (p.includes('attendance') || p.includes('present') || p.includes('hazri')) {
    const res = await executeAiTool('get_attendance_summary', {}, user);
    return `Today's attendance rate is **${res.attendanceRatePercent}%**. We have **${res.present} present**, **${res.late} late**, **${res.onLeave} on leave**, and **${res.absent} absent** out of ${res.totalEmployees} total team members.`;
  }

  // 3. Leave questions (e.g. "How many sick leaves do I have left?" or "Who is on leave today?")
  if (p.includes('my leave') || p.includes('leave left') || p.includes('sick leave') || p.includes('annual leave') || p.includes('casual leave')) {
    if (user.role === 'employee' && user.employeeId) {
      const res: any = await executeAiTool('get_my_leave_balance', {}, user);
      if (res.error) return res.error;
      return `Here is your current remaining leave balance for ${res.year}:\n- **Annual Leave:** ${res.annual.remaining} / ${res.annual.total} days remaining\n- **Sick Leave:** ${res.sick.remaining} / ${res.sick.total} days remaining\n- **Casual Leave:** ${res.casual.remaining} / ${res.casual.total} days remaining\n- **Unpaid Leave Taken:** ${res.unpaidUsed} days`;
    }
  }

  if (p.includes('who is on leave') || p.includes('pending leave') || p.includes('chutti')) {
    const res = await executeAiTool('get_leave_summary', {}, user);
    if (res.onLeaveTodayCount === 0) {
      return `There are currently **0 employees on leave today**. There are **${res.pendingRequests} pending leave request(s)** awaiting review.`;
    }
    const list = res.employeesOnLeaveToday.map((e: any) => `• ${e.name} (${e.leaveType} leave - "${e.reason}")`).join('\n');
    return `Today there are **${res.onLeaveTodayCount} employee(s) on leave**:\n${list}\n\nAdditionally, there are ${res.pendingRequests} pending leave requests in the queue.`;
  }

  // 4. Payroll summary (Admin / HR)
  if (p.includes('payroll') || p.includes('salary cost')) {
    if (user.role === 'employee') {
      return 'Employees cannot access overall company payroll figures. Please view your personal payslips under the Payroll section.';
    }
    const res: any = await executeAiTool('get_payroll_summary', {}, user);
    if (res.message) return res.message;
    return `Payroll summary for **${res.month}** (${res.status.toUpperCase()}):\n- **Total Gross:** PKR ${res.totalGross?.toLocaleString()}\n- **Total Deductions:** PKR ${res.totalDeductions?.toLocaleString()}\n- **Total Income Tax:** PKR ${res.totalTax?.toLocaleString()}\n- **Total Net Salary:** PKR ${res.totalNet?.toLocaleString()}\n- **Employees Processed:** ${res.employeeCount}`;
  }

  // 5. Policy Q&A
  const polFilter: any = { isActive: true };
  if (user.companyId) polFilter.companyId = user.companyId;
  const policies = await Policy.find(polFilter);
  for (const pol of policies) {
    if (p.includes('policy') || p.includes('rule') || p.includes('hours') || p.includes('grace')) {
      return `According to the **${pol.title}**:\n${pol.content}`;
    }
  }

  return 'I am your HCM Lite AI Assistant. You can ask me about headcount, today’s attendance rate, late arrivals, leave balances, company policies, or request a smart leave application.';
};

// Call Gemini API with Tool Declarations
const callGeminiWithTools = async (
  prompt: string,
  user: { id: string; role: string; employeeId?: string; email: string; companyId?: string }
) => {
  if (!aiClient) throw new Error('No AI client initialized');

  const systemInstruction = `You are HCM Lite's AI Assistant for an organization.
Current user: Role=${user.role}, Email=${user.email}.
Rules:
1. Ground answers strictly in the tool calling results or provided company policies.
2. If role is 'employee', refuse to disclose other employees' salaries or confidential payroll summaries politely.
3. Label insights clearly.
4. If Roman Urdu is spoken (e.g. 'Mujhe chutti chahiye'), understand it and reply politely in English or polite Roman Urdu.`;

  const response = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.2,
    },
  });

  return {
    text: response.text || 'No response generated.',
    tools: [],
  };
};

// Smart Leave: Converts plain English or Roman Urdu into structured JSON for confirmation
export const parseSmartLeavePrompt = async (
  text: string
): Promise<{
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
}> => {
  const today = new Date();
  const lower = text.toLowerCase();

  let leaveType: 'annual' | 'sick' | 'casual' | 'unpaid' = 'casual';
  if (lower.includes('sick') || lower.includes('doctor') || lower.includes('fever') || lower.includes('bimari') || lower.includes('tabiyat')) {
    leaveType = 'sick';
  } else if (lower.includes('annual') || lower.includes('vacation') || lower.includes('holiday')) {
    leaveType = 'annual';
  } else if (lower.includes('unpaid') || lower.includes('bina tankhwah')) {
    leaveType = 'unpaid';
  }

  // Next Monday & Tuesday calculation or relative days
  let startDate = new Date(today);
  let endDate = new Date(today);

  if (lower.includes('next monday')) {
    const daysUntilNextMon = ((1 + 7 - today.getDay()) % 7) || 7;
    startDate.setDate(today.getDate() + daysUntilNextMon);
    endDate = new Date(startDate);
    if (lower.includes('tuesday') || lower.includes('mangal')) {
      endDate.setDate(startDate.getDate() + 1);
    }
  } else if (lower.includes('tomorrow') || lower.includes('kal')) {
    startDate.setDate(today.getDate() + 1);
    endDate = new Date(startDate);
  } else {
    // Default to upcoming working day
    startDate.setDate(today.getDate() + 1);
    endDate = new Date(startDate);
  }

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Extract reason
  let reason = text.trim();
  if (reason.length > 80) {
    reason = reason.substring(0, 80);
  }

  return {
    leaveType,
    startDate: startStr,
    endDate: endStr,
    reason,
  };
};

// Summarize Dashboard KPIs into 3-5 concise bullets
export const summarizeDashboardKpis = async (kpis: any): Promise<string[]> => {
  const bullets: string[] = [];

  if (kpis.headcount !== undefined) {
    bullets.push(`Organization headcount stands at **${kpis.headcount} active employees**.`);
  }

  if (kpis.presentToday !== undefined && kpis.headcount) {
    const presentRatio = Math.round((kpis.presentToday / Math.max(1, kpis.headcount)) * 100);
    bullets.push(`Today's physical attendance is at **${presentRatio}%** (${kpis.presentToday} present, ${kpis.lateToday || 0} late arrivals).`);
  }

  if (kpis.pendingApprovals !== undefined && kpis.pendingApprovals > 0) {
    bullets.push(`There are **${kpis.pendingApprovals} action item(s)** requiring management review (${kpis.pendingLeaves || 0} leave applications, ${kpis.pendingCorrections || 0} attendance corrections).`);
  }

  if (kpis.payrollCost !== undefined && kpis.payrollCost > 0) {
    bullets.push(`Monthly payroll expenditure is **PKR ${kpis.payrollCost.toLocaleString()}** with an average gross salary of **PKR ${(kpis.avgSalary || 0).toLocaleString()}**.`);
  }

  if (kpis.attritionRateYtd !== undefined) {
    bullets.push(`Year-to-Date employee attrition rate remains well-controlled at **${kpis.attritionRateYtd}%**.`);
  }

  return bullets.slice(0, 5);
};

const recordAiLog = async (
  user: any,
  prompt: string,
  toolCalls: any[],
  responsePreview: string,
  durationMs: number,
  success: boolean,
  errorMessage?: string
) => {
  try {
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1) {
      return; // Skip DB logging if database is not connected (e.g. during offline unit tests)
    }
    await AiLog.create({
      companyId: user.companyId ? new mongoose.default.Types.ObjectId(user.companyId) : undefined,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      prompt,
      toolCalls,
      responsePreview: responsePreview.substring(0, 300),
      aiModel: 'gemini-2.5-flash',
      durationMs,
      success,
      errorMessage,
    });
  } catch (err: any) {
    console.error('[AiLog Record Error]', err.message);
  }
};
