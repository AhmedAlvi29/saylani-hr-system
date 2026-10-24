import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  askAiAssistant,
  parseSmartLeavePrompt,
  summarizeDashboardKpis,
} from '../services/aiService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// AI Assistant Chat with Tool Calling & Role Security
const chatSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

router.post('/ai/chat', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { prompt } = chatSchema.parse(req.body);

    const result = await askAiAssistant(prompt, {
      id: req.user!.id,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
      email: req.user!.email,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Smart Leave: Convert natural-language into pre-filled leave form
const smartLeaveSchema = z.object({
  prompt: z.string().min(3, 'Please describe your leave request'),
});

router.post('/ai/smart-leave', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { prompt } = smartLeaveSchema.parse(req.body);
    const prefilledData = await parseSmartLeavePrompt(prompt);

    res.json({
      success: true,
      data: prefilledData,
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard KPI Summarizer (Admin & HR)
router.post('/ai/summarize-dashboard', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { kpis } = req.body;
    if (!kpis) {
      res.status(400).json({ success: false, message: 'kpis object is required.' });
      return;
    }

    const bullets = await summarizeDashboardKpis(kpis);

    res.json({
      success: true,
      data: {
        summaryBullets: bullets,
        isAiGenerated: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
