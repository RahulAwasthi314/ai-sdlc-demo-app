import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for managing approvals view and decisions.
 */
export class ApprovalsPage {
  readonly page: Page;
  readonly decisionError: Locator;
  readonly approvalsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.decisionError = page.getByRole('alert');
    this.approvalsTab = page.getByRole('tab', { name: 'Approvals' });
  }

  async goto() {
    await this.approvalsTab.click();
  }

  async approveInvoice(invoiceId: string) {
    await this.page.getByRole('button', { name: `Approve invoice ${invoiceId}` }).click();
  }

  async rejectInvoice(invoiceId: string, reason: string) {
    await this.page.getByLabel(`Rejection reason for ${invoiceId}`).fill(reason);
    await this.page.getByRole('button', { name: `Reject invoice ${invoiceId}` }).click();
  }
}

