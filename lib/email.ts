// lib/email.ts
// Email utility for sending registration confirmation emails using Resend

import { Resend } from 'resend';
import { logger } from './logger';
import { getResendApiKey } from './env';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = getResendApiKey();
    resend = new Resend(apiKey);
  }
  return resend;
}

interface RegistrationEmailParams {
  emails: string[];
  managerName: string;
  teamName: string;
  eventType: 'tn' | 'wu' | 'sc';
  category: string;
  referenceNumber: string;
  totalAmount?: number;
}

export async function sendRegistrationConfirmation(params: RegistrationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const eventTypeLabels: Record<string, string> = {
      tn: 'Traditional (TN)',
      wu: 'Warm-Up (WU)',
      sc: 'Short Course (SC)',
    };

    const { data, error } = await getResend().emails.send({
      from: 'SDBA Test <onboarding@resend.dev>',
      to: ['andyhw808@gmail.com'],
      subject: `Registration Confirmed - ${params.teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">SDBA Registration Confirmed</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Dear ${params.managerName},</p>
            
            <p>Your registration has been <strong style="color: #16a34a;">approved</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                Registration Details
              </h3>
              <table style="width: 100%;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Reference:</td><td><strong>${params.referenceNumber}</strong></td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Team:</td><td>${params.teamName}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Event:</td><td>${eventTypeLabels[params.eventType] || params.eventType.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Category:</td><td>${params.category}</td></tr>
                ${params.totalAmount ? `<tr><td style="padding: 8px 0; color: #6b7280;">Total:</td><td><strong>HK$${params.totalAmount.toLocaleString()}</strong></td></tr>` : ''}
              </table>
            </div>
            
            <p>Please bring this confirmation to race day check-in.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questions? Contact us at info@sdba.org.hk
            </p>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            Stanley Dragon Boat Association<br />
            © ${new Date().getFullYear()} All rights reserved
          </div>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    logger.debug('Email sent:', data);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Email send failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

