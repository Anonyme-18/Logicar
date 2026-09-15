import {
  listInvoicesAction,
  getInvoiceAction,
  convertQuoteAction,
  setInvoiceStatusAction,
} from "./invoices.actions";

export const listInvoices = (_params?: unknown) => listInvoicesAction();
export const getInvoice = ({ data }: { data: { id: string } }) => getInvoiceAction(data);
export const convertQuote = ({ data }: { data: { quote_id: string } }) => convertQuoteAction(data);
export const setInvoiceStatus = ({
  data,
}: {
  data: { id: string; status: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED" };
}) => setInvoiceStatusAction(data);
