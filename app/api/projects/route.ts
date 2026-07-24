export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMrus,
  getActiveMruId,
  setActiveMruId,
  createMru,
  deleteMru,
  getBillingCycles,
  getActiveCycleId,
  setActiveCycleId,
  createBillingCycle,
  deleteBillingCycle,
} from '@/lib/projects';

export async function GET() {
  try {
    const mrus = await getAllMrus();
    const activeMruId = await getActiveMruId();
    const billingCycles = await getBillingCycles(activeMruId);
    const activeCycleId = await getActiveCycleId();
    
    return NextResponse.json({ 
      success: true, 
      mrus, 
      activeMruId,
      billingCycles,
      activeCycleId
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_mru') {
      const { mruCode, mruName } = body;
      if (!mruCode || !mruName) {
        return NextResponse.json({ success: false, error: 'MRU Code and Name required' }, { status: 400 });
      }
      const newMru = await createMru(mruCode, mruName);
      return NextResponse.json({ success: true, mru: newMru });
    }

    if (action === 'create_cycle') {
      const { mruId, billingMonth, billingYear } = body;
      if (!mruId || !billingMonth || !billingYear) {
        return NextResponse.json({ success: false, error: 'MRU ID, Month, and Year required' }, { status: 400 });
      }
      const newCycle = await createBillingCycle(mruId, billingMonth, billingYear);
      return NextResponse.json({ success: true, cycle: newCycle });
    }

    if (action === 'switch_mru') {
      const { mruId } = body;
      if (!mruId) return NextResponse.json({ success: false, error: 'MRU ID required' }, { status: 400 });
      await setActiveMruId(mruId);
      return NextResponse.json({ success: true, activeMruId: mruId });
    }

    if (action === 'switch_cycle') {
      const { cycleId } = body;
      if (!cycleId) return NextResponse.json({ success: false, error: 'Cycle ID required' }, { status: 400 });
      await setActiveCycleId(cycleId);
      return NextResponse.json({ success: true, activeCycleId: cycleId });
    }

    if (action === 'delete_mru') {
      const { mruId } = body;
      if (!mruId) return NextResponse.json({ success: false, error: 'MRU ID required' }, { status: 400 });
      await deleteMru(mruId);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_cycle') {
      const { cycleId } = body;
      if (!cycleId) return NextResponse.json({ success: false, error: 'Cycle ID required' }, { status: 400 });
      await deleteBillingCycle(cycleId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
