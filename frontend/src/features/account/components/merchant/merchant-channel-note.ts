export function merchantChannelDisplayNote(
  reviewNote: string,
  operationReason: string | undefined,
): string {
  return operationReason?.trim() || reviewNote.trim();
}
