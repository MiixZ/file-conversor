import * as mupdf from 'mupdf';

export type PdfAction = 'remove-password' | 'add-password';

export interface PdfOperationOptions {
  action: PdfAction;
  password?: string;
  newPassword?: string;
  ownerPassword?: string;
}

/**
 * Remove the password protection from a PDF file.
 * Requires the current user or owner password to decrypt.
 */
export async function removePassword(
  pdfBuffer: Buffer,
  password: string,
): Promise<Buffer> {
  const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');

  if (!doc.needsPassword()) {
    throw new Error('This PDF is not password-protected.');
  }

  const authResult = doc.authenticatePassword(password);
  if (authResult === 0) {
    throw new Error('Incorrect password.');
  }

  const pdfDoc = doc.asPDF();
  if (!pdfDoc) {
    throw new Error('Failed to process PDF document.');
  }

  const output = pdfDoc.saveToBuffer('decrypt');
  return Buffer.from(output.asUint8Array());
}

/**
 * Add password protection to a PDF file.
 * Sets a user password (required to open) and an optional owner password
 * (controls permissions such as printing and editing).
 */
export async function addPassword(
  pdfBuffer: Buffer,
  userPassword: string,
  ownerPassword?: string,
): Promise<Buffer> {
  const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');

  if (doc.needsPassword()) {
    throw new Error(
      'This PDF is already password-protected. Remove the existing password first.',
    );
  }

  const pdfDoc = doc.asPDF();
  if (!pdfDoc) {
    throw new Error('Failed to process PDF document.');
  }

  const owner = ownerPassword ?? userPassword;
  const options = `encrypt,user-password=${userPassword},owner-password=${owner}`;
  const output = pdfDoc.saveToBuffer(options);
  return Buffer.from(output.asUint8Array());
}

/**
 * Execute a PDF password operation based on the provided options.
 * This is the main entry point for PDF password operations.
 */
export async function processPdf(
  pdfBuffer: Buffer,
  options: PdfOperationOptions,
): Promise<Buffer> {
  switch (options.action) {
    case 'remove-password': {
      if (!options.password) {
        throw new Error('Current password is required to remove protection.');
      }
      return removePassword(pdfBuffer, options.password);
    }
    case 'add-password': {
      if (!options.newPassword) {
        throw new Error('New password is required to add protection.');
      }
      return addPassword(pdfBuffer, options.newPassword, options.ownerPassword);
    }
    default:
      throw new Error(`Unsupported PDF action: ${options.action}`);
  }
}
