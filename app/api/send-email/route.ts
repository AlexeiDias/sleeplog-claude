//app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, subject, htmlContent } = body;

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"SleepLog" <${process.env.EMAIL_USER}>`,
      to,
      cc,
      subject,
      html: htmlContent,
    });

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}