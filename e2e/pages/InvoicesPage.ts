import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for managing invoices and pending approvals.
 */
export class InvoicesPage {
  readonly page: Page;
  readonly customerInput: Locator;
  readonly amountInput: Locator;
  readonly createInvoiceButton: Locator;
  readonly invoicesTab: Locator;
  readonly approvalsTab: Locator;
  readonly decisionError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerInput = page.getByLabel('Customer name');
    this.amountInput = page.getByLabel('Amount');
    this.createInvoiceButton = page.getByRole('button', { name: 'Create invoice' });
    this.invoicesTab = page.getByRole('tab', { name: 'Invoices' });
    this.approvalsTab = page.getByRole('tab', { name: 'Approvals' });
    this.decisionError = page.getByRole('alert');
  }

  async createInvoice(customer: string, amount: string | number) {
    await this.customerInput.fill(customer);
    await this.amountInput.fill(String(amount));
    await this.createInvoiceButton.click();
  }

  async submitInvoiceForApproval(invoiceId: string) {
    await this.page.getByRole('button', { name: `Submit invoice ${invoiceId} for approval` }).click();
  }

  async goToApprovalsTab() {
    await this.approvalsTab.click();
  }

  async approveInvoice(invoiceId: string) {
    await this.page.getByRole('button', { name: `Approve invoice ${invoiceId}` }).click();
  }
}
