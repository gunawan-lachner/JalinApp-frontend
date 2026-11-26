export function buildDeleteAttrConfirmMessage(attr: {
  id: number | string
  field?: string | null
}): string {
  const field = String(attr.field ?? "").trim()
  if (field) {
    return `Hapus atribut "${field}" (ID ${attr.id})?`
  }
  return `Hapus atribut (ID ${attr.id})?`
}

export function removeAttrById<T extends { id: number | string }>(
  attrs: T[],
  id: number | string,
): T[] {
  const target = String(id)
  return attrs.filter((a) => String(a.id) !== target)
}