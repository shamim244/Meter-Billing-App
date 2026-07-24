export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getCAData, saveCAData, removeCADuplicates } from '@/lib/data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mruId = searchParams.get('mruId') || undefined;
    const data = await getCAData(mruId);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, mruId } = body;

    if (action === 'save') {
      await saveCAData(content || '', mruId);
      return NextResponse.json({ success: true, message: 'File saved successfully.' });
    }

    if (action === 'remove_duplicates') {
      await removeCADuplicates(mruId);
      return NextResponse.json({ success: true, message: 'Duplicates removed successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
