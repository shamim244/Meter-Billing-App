import { NextRequest, NextResponse } from 'next/server';
import { updateConsumerStatus } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ca, status, cycleId } = body;

    if (!ca) {
      return NextResponse.json(
        { success: false, error: 'Missing CA number' },
        { status: 400 }
      );
    }

    await updateConsumerStatus(ca, status, cycleId);
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
