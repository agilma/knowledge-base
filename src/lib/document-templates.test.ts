import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENT_TEMPLATES,
  isEquivalentMarkdown,
  isUntouchedTemplate,
} from "./document-templates";

test("re-formatting by the editor is not an edit", () => {
  assert.equal(isEquivalentMarkdown("Ini _penting_ sekali", "Ini *penting* sekali"), true);
  assert.equal(isEquivalentMarkdown("Ini __tebal__ sekali", "Ini **tebal** sekali"), true);
  assert.equal(isEquivalentMarkdown("- satu\n- dua", "* satu\n* dua"), true);
  assert.equal(isEquivalentMarkdown("a\r\nb  \n\n\n\nc", "a\nb\n\nc"), true);
});

test("a real change is still an edit", () => {
  assert.equal(isEquivalentMarkdown("Ini _penting_", "Ini _sangat penting_"), false);
  assert.equal(isEquivalentMarkdown("- satu", "- satu\n- dua"), false);
});

test("underscores inside identifiers are left alone", () => {
  assert.equal(isEquivalentMarkdown("kolom snake_case_name", "kolom snake*case*name"), false);
  assert.equal(isEquivalentMarkdown("pakai \\_literal\\_", "pakai *literal*"), false);
});

test("an untouched template is recognised, an edited one is not", () => {
  for (const template of Object.values(DOCUMENT_TEMPLATES)) {
    assert.equal(isUntouchedTemplate(template), true);
    assert.equal(isUntouchedTemplate(`${template}\nSudah diisi.`), false);
  }
  assert.equal(isUntouchedTemplate(""), true);
});
