export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; message?: string }
  | { ok: false; error: string };

export function actionSuccess<TData = undefined>(
  pData: TData,
  pMessage?: string,
): ActionResult<TData> {
  if (pMessage === undefined) {
    return { ok: true, data: pData };
  }
  return { ok: true, data: pData, message: pMessage };
}

export function actionError(pError: string): ActionResult<never> {
  return { ok: false, error: pError };
}

export function firstZodError(pError: { issues: Array<{ message: string }> }): string {
  return pError.issues[0]?.message ?? "Données invalides.";
}
