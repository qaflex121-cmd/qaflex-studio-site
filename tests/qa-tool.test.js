"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {generateCases,toCsv,toText,csvEscape,toJson,fromJson,EXAMPLE}=require("../qa-tool.js");
test("empty requirements return no cases",()=>assert.deepEqual(generateCases("   ","web","Medium","balanced"),[]));
test("generates generic positive and web accessibility/responsive cases",()=>{
 const cases=generateCases("A visitor can search for an article.","web","High","balanced");
 assert.ok(cases.some(c=>c.category==="Positive"));
 assert.ok(cases.some(c=>c.category==="Accessibility"));
 assert.ok(cases.some(c=>c.category==="Responsive UI"));
 assert.ok(cases.every(c=>c.priority==="High"));
});
test("adds authentication, validation and boundary suggestions when relevant",()=>{
 const cases=generateCases("User sign in requires email and password. After five failed attempts account is locked.","generic","Medium","negative");
 for(const category of ["Positive","Negative","Validation","Security","Boundary"]) assert.ok(cases.some(c=>c.category===category), "missing "+category);
});
test("API mode adds contract, malformed input and authorization cases",()=>{
 const cases=generateCases("GET /orders returns orders for a user.","api","Low","balanced");
 for(const category of ["API contract","API negative","Security"]) assert.ok(cases.some(c=>c.category===category));
});
test("CSV escapes commas, quotes and line breaks",()=>{
 assert.equal(csvEscape('a,"b"'), '"a,""b"""');
 const csv=toCsv([{id:"TC-1",title:"A, B",priority:"High",category:"Positive",steps:"line 1\nline 2",expected:'say "ok"',status:"Not run"}]);
 assert.match(csv,/"A, B"/);assert.match(csv,/"line 1\nline 2"/);assert.match(csv,/"say ""ok"""/);
});
test("text export includes case IDs and expected results",()=>{
 const cases=generateCases(EXAMPLE,"web","Medium","balanced");
 const text=toText(cases);assert.match(text,/TC-001/);assert.match(text,/Expected:/);
});

test("JSON export preserves edited fields and round-trips safely",()=>{const cases=generateCases("A user can sign in.","web","High","balanced");cases[0].expected="Custom expected result";cases[0].status="Pass";assert.deepEqual(fromJson(toJson(cases)),cases);});
test("JSON import rejects malformed and unsupported files",()=>{assert.throws(()=>fromJson("{bad json"),/valid JSON/);assert.throws(()=>fromJson({format:"other",version:1,cases:[]}),/supported/);assert.throws(()=>fromJson({format:"qaflex-test-cases",version:1,cases:[{id:"1"}]}),/missing required/);});
test("JSON import rejects unsupported status and excessive case counts",()=>{const one={id:"TC-1",title:"Title",priority:"Medium",category:"Positive",steps:"Do it",expected:"It works",status:"Unknown"};assert.throws(()=>fromJson({format:"qaflex-test-cases",version:1,cases:[one]}),/priority or status/);assert.throws(()=>fromJson({format:"qaflex-test-cases",version:1,cases:Array(501).fill(one)}),/500 test cases/);});
