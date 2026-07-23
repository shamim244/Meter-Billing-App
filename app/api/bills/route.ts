import { NextRequest, NextResponse } from 'next/server';
import { getBillData } from '@/lib/data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycleId') || undefined;
    const bills = await getBillData(cycleId);
    return NextResponse.json({ success: true, bills });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
