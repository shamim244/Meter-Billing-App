export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import {
  getLogs,
  clearLogs,
  getProcessStatus,
  unlockProcess,
  runTaskAsync,
  getCAData,
  getBillData,
  getPdfCount,
} from '@/lib/data';
import { getActiveMruId, getActiveCycleId } from '@/lib/projects';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    let mruId = searchParams.get('mruId') || undefined;
    let cycleId = searchParams.get('cycleId') || undefined;

    if (!mruId) mruId = await getActiveMruId();
    if (!cycleId) cycleId = await getActiveCycleId();

    if (action === 'status') {
      const status = getProcessStatus(cycleId);
      return NextResponse.json({
        running: status.running,
        task: status.task,
        startTime: status.startTime,
        timeFormatted: status.startTime
          ? new Date(status.startTime * 1000).toISOString()
          : '',
      });
    }

    if (action === 'logs') {
      const logs = await getLogs(cycleId);
      return NextResponse.json({ logs });
    }

    if (action === 'get_stats') {
      const ca = await getCAData(mruId);
      const bills = await getBillData(cycleId);
      const pdfCount = getPdfCount(cycleId);
      return NextResponse.json({
        ca_count: ca.uniqueEntries,
        pdf_count: pdfCount || bills.length,
        db_count: bills.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
    const { action, task } = body;
    let { cycleId } = body;

    if (!cycleId) cycleId = await getActiveCycleId();

    if (action === 'run') {
      if (task !== 'main' && task !== 'info') {
        return NextResponse.json(
          { success: false, error: 'Invalid task name' },
          { status: 400 }
        );
      }

      const currentStatus = getProcessStatus(cycleId);
      if (currentStatus.running) {
        return NextResponse.json(
          { success: false, error: 'Another process is currently running for this cycle.' },
          { status: 400 }
        );
      }

      runTaskAsync(task === 'main' ? 'downloader' : 'parser', cycleId);
      return NextResponse.json({
        success: true,
        task,
        mode: 'background',
      });
    }

    if (action === 'unlock') {
      unlockProcess(cycleId);
      return NextResponse.json({ success: true });
    }

    if (action === 'clear_logs') {
      await clearLogs(cycleId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
