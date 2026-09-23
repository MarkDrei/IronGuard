import { createLockContext, LOCK_2, LOCK_5, LOCK_8 } from '../index';

type WorkflowName = 'reconcile-ledger' | 'dispatch-webhook';

async function runWorkflow(name: WorkflowName): Promise<void> {
  const root = createLockContext();

  await root.useLockWithAcquire(LOCK_2, async (stateCtx) => {
    console.log(`${name}: claimed workflow-state gate -> [${stateCtx.getHeldLocks()}]`);

    await stateCtx.useLockWithAcquire(LOCK_5, async (ledgerCtx) => {
      console.log(`${name}: entered ledger critical section -> [${ledgerCtx.getHeldLocks()}]`);

      await ledgerCtx.useLockWithAcquire(LOCK_8, async (dispatchCtx) => {
        console.log(`${name}: entered outbound dispatch gate -> [${dispatchCtx.getHeldLocks()}]`);
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    });
  });
}

export async function runWorkflowCoordinationDemo(): Promise<void> {
  console.log('\n=== Workflow coordination demo ===');
  console.log('Use case: orchestrating async workflow state, ledger updates, and outbound dispatch.');
  console.log('IronGuard enforces the resource hierarchy 2 -> 5 -> 8 at compile time.\n');

  await Promise.all([
    runWorkflow('reconcile-ledger'),
    runWorkflow('dispatch-webhook')
  ]);

  console.log('\n✓ Both workflows completed without violating the shared lock order.');
}
