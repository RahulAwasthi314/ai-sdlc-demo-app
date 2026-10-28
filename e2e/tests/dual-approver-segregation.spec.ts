import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InvoicesPage } from '../pages/InvoicesPage';

test.describe('Dual approver segregation', () => {
  test('Same user may never count as both approvers on one invoice and rejected attempt leaves invoice unchanged', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const invoicesPage = new InvoicesPage(page);

    // 1. Sign in as demo.manager (who is already registered as an approver on INV-1006)
    await loginPage.goto();
    await loginPage.login('demo.manager', 'ChangeMe123!');

    // 2. Switch to Approvals tab
    await invoicesPage.goToApprovalsTab();

    // 3. Attempt to approve invoice INV-1006 where demo.manager was the first approver
    await invoicesPage.approveInvoice('INV-1006');

    // 4. Verify rejection error banner displays clear reason: SAME_APPROVER_NOT_ALLOWED
    const errorAlert = invoicesPage.decisionError;
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('The same user may never count as both approvers on one invoice.');

    // 5. Verify the invoice remains in pending state and button is still present
    await expect(page.getByRole('button', { name: 'Approve invoice INV-1006' })).toBeVisible();
  });
});
