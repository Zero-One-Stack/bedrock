# Test fixtures

Real on-disk files for `component-folder-contract.test.js`.

That rule checks for a **sibling test/story file**, which means reading the directory — so its
cases can't be expressed with the synthetic paths RuleTester normally uses. These fixtures give
it a real tree to read.

The files are intentionally **empty**: the rule only inspects filenames and directory entries,
never file contents. The code under test is supplied by RuleTester in the test file itself.

| Fixture | Represents |
| --- | --- |
| `atoms/button/` | A complete component folder — impl + test + story + barrel. Must produce no errors. |
| `atoms/badge/` | Missing both test and story. |
| `molecules/field/` | Has a test, missing the story. |
| `organisms/data-table/` | Complete, plus `table-pagination.tsx` — a subcomponent, which is exempt from needing its own test/story. |

Do not add real component code here; if a case needs different *source*, put it in the test's
`code` string instead.
