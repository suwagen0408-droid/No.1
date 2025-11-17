import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['manufacturer', 'facility']),
  companyName: z.string().optional(),
  facilityName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user and related profile
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
        role: validatedData.role,
        status: 'pending',
      },
    });

    // Create manufacturer or facility profile
    if (validatedData.role === 'manufacturer' && validatedData.companyName) {
      await prisma.manufacturer.create({
        data: {
          userId: user.id,
          companyName: validatedData.companyName,
        },
      });
    } else if (validatedData.role === 'facility' && validatedData.facilityName) {
      await prisma.facility.create({
        data: {
          userId: user.id,
          facilityName: validatedData.facilityName,
          facilityType: 'other', // デフォルト値
        },
      });
    }

    return NextResponse.json(
      {
        message: '登録が完了しました。管理者の承認をお待ちください。',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力データが正しくありません', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
