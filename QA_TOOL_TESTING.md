# Free QA Test Case Generator

## Location
- Page: `qa-tool.html`
- Logic: `qa-tool.js`
- Tests: `tests/qa-tool.test.js`

## Features
- Generates a first-draft set of test cases from a pasted requirement.
- Web UI, API, and general feature modes.
- Positive, validation, negative, boundary, resilience, accessibility, responsive, and API contract suggestions when relevant.
- Edit priority, expected result, and execution status.
- Export CSV or copy cases as text.\n- Save a JSON backup and load it later, preserving edited fields and status.\n- Validate imported JSON and reject unsupported or malformed files.
- Works as a static page without a backend, account, API key, or external JavaScript library.

## Privacy and limitations
The tool processes requirement text locally in the browser. It does not submit the input to a server. Users should still avoid entering confidential information. Generation uses simple heuristics; it is not an AI model and does not execute tests. Generated cases are suggestions and must be reviewed for project-specific requirements, risks, and expected behavior.

## Test locally
Requires Node.js 18 or later (uses the built-in Node test runner).

```bash
npm test
```

To preview the site from the repository root, start a static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/qa-tool.html`. A static server is recommended over opening the file directly because clipboard permissions vary by browser and origin.

## Manual acceptance checklist
- [ ] The homepage navigation and hero CTA open `qa-tool.html`.
- [ ] Empty input gives a helpful message.
- [ ] Example loads and the character counter updates.
- [ ] Generate cases in Web UI, API, and General modes.
- [ ] Edit a priority and expected result; change execution status.
- [ ] Copy as text works on a supported secure/local origin.
- [ ] CSV download opens with correctly escaped commas, quotes, and line breaks.\n- [ ] Save JSON, reload it, and confirm edited priorities, expected results, and statuses are preserved.\n- [ ] Malformed, unsupported, oversized, or invalid-schema JSON is rejected without replacing current cases.
- [ ] Test at desktop and mobile widths.
- [ ] Confirm browser developer tools show no uncaught errors.
- [ ] Confirm the tool does not make network requests when generating cases.


## Free API Testing Helper
- Page: `api-tool.html`; logic: `api-tool.js`.
- Produces draft positive, negative, authorization, content-type, and method-specific scenarios from endpoint details.
- Creates example cURL and browser Fetch snippets for the user to adapt.
- The helper does not send requests or execute API calls; snippets are displayed as text only. Use placeholders for secrets and never enter real credentials.
- Manual checks: try GET and POST, bearer auth, empty endpoint validation, copy scenario text, and verify generated snippets are examples only.
