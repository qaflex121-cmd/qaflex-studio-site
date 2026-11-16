(function (root) {
  "use strict";
  const EXAMPLE = "A registered user can sign in with a valid email and password.\nInvalid credentials show a clear error message.\nAfter five failed attempts, the account is temporarily locked.\nThe form requires email and password fields.";
  function csvEscape(value) {
    const text = String(value == null ? "" : value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function generateCases(requirement, area, priority, coverage) {
    const input = String(requirement || "").trim();
    if (!input) return [];
    const lines = input.split(/[\n.!?]+/).map(s => s.trim()).filter(Boolean);
    const cases = [];
    const add = (title, steps, expected, category) => {
      if (!cases.some(c => c.title === title)) cases.push({id:"TC-" + String(cases.length + 1).padStart(3,"0"), title, priority:priority || "Medium", category, steps, expected, status:"Not run"});
    };
    add("Verify the primary requirement", "Set up the preconditions described in the requirement; perform the main user action.", "The application behaves as described in the requirement.", "Positive");
    if (/login|sign.?in|authenticate|password|credential/i.test(input)) {
      add("Reject invalid credentials", "Submit an incorrect password or invalid credential combination.", "Access is denied and a clear, non-sensitive error is shown.", "Negative");
      add("Validate required authentication fields", "Submit the form with each required field empty, one at a time.", "Submission is blocked or a clear field-level validation message appears.", "Validation");
      add("Verify repeated failed attempts", "Repeat failed authentication attempts up to and beyond any stated limit.", "The documented rate limit or lockout policy is enforced without exposing account details.", "Security");
    }
    if (/required|mandatory|empty|blank|missing/i.test(input)) add("Check missing required values", "Leave each required field empty and submit.", "Each missing value is identified and invalid submission is prevented.", "Validation");
    if (/email|format|validat/i.test(input)) add("Check invalid input format", "Enter malformed values and submit, including leading/trailing whitespace where relevant.", "Invalid values are rejected with actionable feedback.", "Validation");
    if (/limit|maximum|minimum|length|character|five|\b\d+\b/i.test(input)) add("Check boundary values", "Test just below, at, and just above each stated numeric or length boundary.", "Boundary behavior matches the requirement; no unexpected truncation or overflow occurs.", "Boundary");
    if (/error|fail|unavailable|timeout|retry/i.test(input)) add("Check error and recovery behavior", "Trigger a controlled failure, timeout, or unavailable dependency, then retry if supported.", "The error is handled safely and recovery follows the documented behavior.", "Resilience");
    if (area === "web") {
      add("Check keyboard and visible focus", "Navigate the control flow using keyboard only; inspect focus order and visible focus.", "Interactive controls are keyboard operable and focus remains visible and logical.", "Accessibility");
      add("Check layout at narrow viewport", "Repeat the main flow at a narrow mobile viewport and zoomed layout.", "Content and controls remain readable and usable without unintended horizontal overflow.", "Responsive UI");
    } else if (area === "api") {
      add("Check API response contract", "Call the endpoint with a valid request and inspect status, headers, and response schema.", "Status and response structure match the documented API contract.", "API contract");
      add("Check malformed API input", "Send missing fields, invalid types, and malformed payloads.", "The API returns documented client-error responses without leaking stack traces or secrets.", "API negative");
      add("Check unauthorized API access", "Call the endpoint without credentials and with an insufficient permission level.", "Access is denied with the documented status and no protected data is returned.", "Security");
    } else {
      add("Check permissions and access control", "Repeat the action as an unauthenticated user and as a user with limited permissions, if applicable.", "Only authorized users can perform restricted actions.", "Security");
    }
    if (coverage === "negative") {
      add("Explore invalid and unexpected values", "Try empty, malformed, out-of-range, and unexpected values relevant to the requirement.", "Invalid inputs are handled predictably without corrupting state.", "Negative");
    } else if (coverage === "accessibility") {
      add("Check clear labels and instructions", "Review labels, instructions, validation messages, and error announcements.", "Controls have understandable labels and feedback is perceivable without relying on color alone.", "Accessibility");
    }
    lines.slice(0, 8).forEach((line, i) => add("Verify acceptance criterion " + (i + 1) + ": " + line.slice(0, 100), "Set up the scenario for this criterion and perform the described action.", "The result satisfies: " + line, "Acceptance criteria"));
    return cases;
  }
  function toCsv(cases) {
    const headers = ["ID","Title","Priority","Category","Steps","Expected Result","Status"];
    return [headers].concat((cases || []).map(c => [c.id,c.title,c.priority,c.category,c.steps,c.expected,c.status])).map(row => row.map(csvEscape).join(",")).join("\r\n");
  }
  function toText(cases) {
    return (cases || []).map(c => c.id + " — " + c.title + "\nPriority: " + c.priority + " | Category: " + c.category + "\nSteps: " + c.steps + "\nExpected: " + c.expected + "\nStatus: " + c.status).join("\n\n");
  }
  function toJson(cases) { return JSON.stringify({format:"qaflex-test-cases",version:1,cases:cases || []},null,2); }
  function fromJson(source) {
    let data;
    try { data = typeof source === "string" ? JSON.parse(source) : source; } catch (_) { throw new Error("The selected file is not valid JSON."); }
    if (!data || data.format !== "qaflex-test-cases" || data.version !== 1 || !Array.isArray(data.cases)) throw new Error("This file is not a supported QAFlex test-case export.");
    if (data.cases.length > 500) throw new Error("The file contains more than 500 test cases.");
    const fields=["id","title","priority","category","steps","expected","status"], priorities=["High","Medium","Low"], statuses=["Not run","Pass","Fail","Blocked"];
    return data.cases.map((item,index)=>{
      if (!item || typeof item!=="object" || fields.some(key=>typeof item[key]!=="string")) throw new Error("Test case "+(index+1)+" is missing required text fields.");
      if (!priorities.includes(item.priority)||!statuses.includes(item.status)) throw new Error("Test case "+(index+1)+" has an unsupported priority or status.");
      for (const key of fields) if(item[key].length>10000) throw new Error("A field in test case "+(index+1)+" is too long.");
      return Object.fromEntries(fields.map(key=>[key,item[key]]));
    });
  }
  const api = {generateCases,toCsv,toText,csvEscape,toJson,fromJson,EXAMPLE};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;
  const $ = id => root.document.getElementById(id);
  const input = $("requirement"), results = $("results"), status = $("status");
  let current = [];
  input.addEventListener("input", () => $("char-count").textContent = String(input.value.length));
  function render() {
    if (!current.length) { results.innerHTML = '<p class="muted">No test cases yet. Enter a requirement and generate cases.</p>'; $("copy").disabled = $("export").disabled = $("save-json").disabled = true; return; }
    const table = root.document.createElement("table");
    table.innerHTML = "<thead><tr><th>ID</th><th>Test case</th><th>Priority</th><th>Category</th><th>Steps</th><th>Expected result</th><th>Status</th></tr></thead>";
    const tbody = root.document.createElement("tbody");
    current.forEach((c, i) => {
      const tr = root.document.createElement("tr");
      [c.id,c.title,c.priority,c.category,c.steps,c.expected].forEach((value, j) => {
        const td = root.document.createElement("td");
        if (j === 2 || j === 5) { const field = root.document.createElement("input"); field.value = value; field.setAttribute("aria-label", c.id + (j===2 ? " priority" : " expected result")); field.addEventListener("change", () => c[j===2 ? "priority" : "expected"] = field.value); td.appendChild(field); }
        else td.textContent = value;
        tr.appendChild(td);
      });
      const td = root.document.createElement("td"), select = root.document.createElement("select");
      ["Not run","Pass","Fail","Blocked"].forEach(v => {const o=root.document.createElement("option");o.value=o.textContent=v;select.appendChild(o);});
      select.value=c.status;select.setAttribute("aria-label",c.id+" status");select.addEventListener("change",()=>c.status=select.value);td.appendChild(select);tr.appendChild(td);tbody.appendChild(tr);
    });
    table.appendChild(tbody); results.replaceChildren(table); $("copy").disabled = $("export").disabled = $("save-json").disabled = false;
  }
  $("generate").addEventListener("click", () => {
    current = generateCases(input.value, $("area").value, $("priority").value, $("coverage").value);
    render(); status.textContent = current.length ? current.length + " suggested test cases generated. Review and edit them before use." : "Enter a requirement first.";
  });
  $("load-example").addEventListener("click", () => {input.value=EXAMPLE;$("char-count").textContent=String(input.value.length);input.focus();status.textContent="Example loaded. Select Generate test cases when ready.";});
  $("clear").addEventListener("click", () => {input.value="";$("char-count").textContent="0";current=[];render();status.textContent="Cleared.";input.focus();});
  $("copy").addEventListener("click", async () => {try {await root.navigator.clipboard.writeText(toText(current));status.textContent="Test cases copied to clipboard.";} catch (_) {status.textContent="Clipboard access is unavailable here. Use Export CSV instead."; }});
  function download(content,type,filename) { const url=URL.createObjectURL(new Blob([content],{type})); const a=root.document.createElement("a"); a.href=url; a.download=filename; a.click(); root.setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $("export").addEventListener("click",()=>{download("\\ufeff"+toCsv(current),"text/csv;charset=utf-8;","qaflex-test-cases.csv");status.textContent="CSV export started.";});
  $("save-json").addEventListener("click",()=>{download(toJson(current),"application/json;charset=utf-8;","qaflex-test-cases.json");status.textContent="JSON backup download started.";});
  $("load-json").addEventListener("click",()=>$("json-file").click());
  $("json-file").addEventListener("change",async event=>{
    const file=event.target.files&&event.target.files[0]; if(!file)return;
    if(file.size>2*1024*1024){status.textContent="File is too large. Choose a JSON file smaller than 2 MB.";event.target.value="";return;}
    try{current=fromJson(await file.text());render();status.textContent="Loaded "+current.length+" test cases. Review them before use.";}
    catch(error){status.textContent=error.message||"Could not load this file.";}
    event.target.value="";
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
