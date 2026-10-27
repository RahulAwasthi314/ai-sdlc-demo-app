import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InvoicesPage } from '../pages/InvoicesPage';

test.describe('Role-based approval limits', () => {
  test('Manager cannot approve invoice exceeding 50,000 threshold and error is displayed', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const invoicesPage = new InvoicesPage(page);

    // 1. Sign in as demo.manager
    await loginPage.goto();
    await loginPage.login('demo.manager', 'ChangeMe123!');

    // 2. Create an invoice with amount > 50,000 (e.g. 60,000)
    const customer = `HighValue Corp ${Date.now()}`;
    await invoicesPage.createInvoice(customer, 60000);

    // 3. Find created invoice and submit it for approval
    const invoiceRow = page.getByRole('row', { name: customer });
    await expect(invoiceRow).toBeVisible();

    const invoiceId = await invoiceRow.locator('td').first().innerText();
    await invoicesPage.submitInvoiceForApproval(invoiceId);

    // Verify invoice row now shows Pending Approval
    await expect(invoiceRow.getByText('Pending Approval')).toBeVisible();

    // 4. Switch to Approvals tab
    await invoicesPage.goToApprovalsTab();

    // 5. Attempt to approve the over-limit invoice as Manager
    await invoicesPage.approveInvoice(invoiceId);

    // 6. Verify error alert is displayed explaining the threshold rejection
    const errorAlert = invoicesPage.decisionError;
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Manager approval limit exceeded');
    await expect(errorAlert).toContainText('50000.00');

    // 7. Verify the invoice is still pending in the approvals list
    await expect(page.getByRole('button', { name: `Approve invoice ${invoiceId}` })).toBeVisible();
  });
});
