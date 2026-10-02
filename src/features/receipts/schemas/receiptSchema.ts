import { z } from 'zod'

const shortText = z.string().max(500)
const longText = z.string().max(10_000)
const money = z.number().finite().min(-1_000_000_000).max(1_000_000_000)
const signedMoney = money
const percentage = z.number().finite().min(0).max(100)
const safeLogo = z.string().max(2_100_000).refine(
  value => value === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),
  'Logo must be a PNG, JPEG, or WebP image',
)

export const businessSchema = z.object({
  businessName: shortText, logo: safeLogo, address: longText, phone: shortText,
  email: shortText, website: shortText, taxNumber: shortText,
  registrationNumber: shortText, defaultFooter: longText, paymentMethods: longText,
}).strict()

const customerSchema = z.object({ name: shortText, phone: shortText, email: shortText, address: longText, taxNumber: shortText }).strict()
const itemSchema = z.object({
  id: z.string().uuid(), name: shortText, description: longText,
  flavour: shortText.optional(), expiryDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  quantity: z.number().finite().min(-1_000_000).max(1_000_000), unit: shortText,
  price: money, discount: percentage, tax: percentage, total: money,
}).strict()
const appearanceSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), font: z.enum(['sans', 'serif', 'mono']),
  title: shortText, footer: longText, showReceiptTitle: z.boolean().optional(), showReceiptDetails: z.boolean().optional(), showBusinessSection: z.boolean().optional(), showBillingSection: z.boolean().optional(), showBusinessContact: z.boolean(),
  showCustomerContact: z.boolean(), showItemDescription: z.boolean(), showTerms: z.boolean(), showPaymentSummary: z.boolean().optional(),
  size: z.enum(['a4', 'a5', 'thermal', 'custom']),
  customWidth: z.number().finite().min(40).max(1000), customHeight: z.number().finite().min(40).max(2000),
}).strict()

export const storedReceiptSchema = z.object({
  id: z.string().uuid(), receiptNumber: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/),
  business: businessSchema, customer: customerSchema, items: z.array(itemSchema).min(1).max(1000),
  subtotal: money, discount: money, tax: money, additionalCharges: money, total: money,
  amountPaid: money, balance: signedMoney, paymentMethod: shortText, notes: longText, terms: longText,
  templateId: z.enum(['minimal', 'classic', 'modern', 'compact', 'professional']), appearance: appearanceSchema,
  status: z.enum(['draft', 'unpaid', 'partial', 'paid']), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
}).strict()

export const appSettingsSchema = z.object({
  id: z.literal('settings'), currency: z.string().regex(/^[A-Z]{3}$/), dateFormat: z.enum(['short', 'long']),
  prefix: z.string().max(40), startingNumber: z.number().int().min(1).max(999_999_999),
  digits: z.number().int().min(1).max(12), nextNumber: z.number().int().min(1).max(999_999_999),
  defaultTemplate: z.enum(['minimal', 'classic', 'modern', 'compact', 'professional']),
  defaultPaymentMethod: shortText, defaultTax: percentage, theme: z.enum(['light', 'dark']),
  exportScale: z.number().int().min(1).max(3),
}).strict()

export const businessRecordSchema = businessSchema.extend({ id: z.literal('default') }).strict()

// Required-field validation for the interactive editor. External files use the full schemas above.
export const receiptSchema = z.object({
  receiptNumber: z.string().trim().min(1, 'Receipt number is required'),
  business: z.object({ businessName: z.string().trim().min(1, 'Business name is required') }),
  customer: z.object({ name: z.string() }),
  items: z.array(z.object({ name: z.string().trim().min(1, 'Item name is required'), quantity: z.coerce.number().min(-1_000_000).max(1_000_000), price: z.coerce.number().min(-1_000_000_000).max(1_000_000_000), discount: z.coerce.number().min(0).max(100), tax: z.coerce.number().min(0).max(100) })).min(1, 'Add at least one item'),
  amountPaid: z.coerce.number().min(-1_000_000_000).max(1_000_000_000),
  additionalCharges: z.coerce.number().min(-1_000_000_000).max(1_000_000_000),
})
