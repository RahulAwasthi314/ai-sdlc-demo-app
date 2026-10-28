import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InvoicesPage } from '../pages/InvoicesPage';

test.describe('Director approval limits', () => {
  test('Director can approve invoice up to 500,000 but is blocked beyond 500,000', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const invoicesPage = new InvoicesPage(page);

    // 1. Sign in as demo.director
    await loginPage.goto();
    await loginPage.login('demo.director', 'ChangeMe123!');

    // 2. Create an invoice within Director limit (e.g. 250,000)
    const withinCustomer = `Director Corp ${Date.now()}`;
    await invoicesPage.createInvoice(withinCustomer, 250000);

    const withinRow = page.getByRole('row', { name: withinCustomer });
    await expect(withinRow).toBeVisible();

    const withinId = await withinRow.locator('td').first().innerText();
    await invoicesPage.submitInvoiceForApproval(withinId);
    await expect(withinRow.getByText('Pending Approval')).toBeVisible();

    // 3. Create an invoice exceeding Director limit (e.g. 550,000)
    const overCustomer = `Executive Mega Corp ${Date.now()}`;
    await invoicesPage.createInvoice(overCustomer, 550000);

    const overRow = page.getByRole('row', { name: overCustomer });
    await expect(overRow).toBeVisible();

    const overId = await overRow.locator('td').first().innerText();
    await invoicesPage.submitInvoiceForApproval(overId);
    await expect(overRow.getByText('Pending Approval')).toBeVisible();

    // 4. Switch to Approvals tab
    await invoicesPage.goToApprovalsTab();

    // 5. Approve within-limit invoice (250,000)
    await invoicesPage.approveInvoice(withinId);
    await expect(page.getByRole('button', { name: `Approve invoice ${withinId}` })).not.toBeVisible();

    // 6. Attempt to approve over-limit invoice (550,000)
    await invoicesPage.approveInvoice(overId);

    // 7. Verify error alert is displayed explaining threshold rejection
    const errorAlert = invoicesPage.decisionError;
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Director approval limit exceeded');
    await expect(errorAlert).toContainText('500000.00');

    // 8. Verify the invoice remains in pending state
    await expect(page.getByRole('button', { name: `Approve invoice ${overId}` })).toBeVisible();
  });
});

