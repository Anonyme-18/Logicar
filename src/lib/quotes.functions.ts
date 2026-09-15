import {
  getQuoteEditorAction,
  renderQuotePreviewAction,
  saveQuoteAction,
  setQuoteStatusAction,
  listQuotesAction,
  createClientQuickAction,
  type DraftInput,
} from "./quotes.actions";
import type { QuoteInput, ClientInput } from "./schemas";

export const getQuoteEditor = ({ data }: { data: { id?: string } }) => getQuoteEditorAction(data);
export const renderQuotePreview = ({ data }: { data: DraftInput }) =>
  renderQuotePreviewAction(data);
export const saveQuote = ({ data }: { data: QuoteInput }) => saveQuoteAction(data);
export const setQuoteStatus = ({
  data,
}: {
  data: { id: string; status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" };
}) => setQuoteStatusAction(data);
export const listQuotes = (_params?: unknown) => listQuotesAction();
export const createClientQuick = ({ data }: { data: ClientInput }) => createClientQuickAction(data);
