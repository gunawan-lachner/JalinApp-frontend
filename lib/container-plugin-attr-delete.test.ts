import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildDeleteAttrConfirmMessage,
  removeAttrById,
} from "./container-plugin-attr-delete"

describe("buildDeleteAttrConfirmMessage", () => {
  it("includes field and id", () => {
    assert.equal(
      buildDeleteAttrConfirmMessage({ id: 412152, field: "PARTICIPANT" }),
      'Hapus atribut "PARTICIPANT" (ID 412152)?',
    )
  })

  it("omits field quotes when field blank", () => {
    assert.equal(
      buildDeleteAttrConfirmMessage({ id: 1, field: "  " }),
      "Hapus atribut (ID 1)?",
    )
    assert.equal(
      buildDeleteAttrConfirmMessage({ id: 1, field: null }),
      "Hapus atribut (ID 1)?",
    )
  })
})

describe("removeAttrById", () => {
  it("removes matching id", () => {
    const rows = [
      { id: 1, field: "A" },
      { id: 2, field: "B" },
    ]
    assert.deepEqual(removeAttrById(rows, 1), [{ id: 2, field: "B" }])
    assert.deepEqual(removeAttrById(rows, "2"), [{ id: 1, field: "A" }])
  })

  it("returns same list when id missing", () => {
    const rows = [{ id: 1, field: "A" }]
    assert.deepEqual(removeAttrById(rows, 99), rows)
  })
})