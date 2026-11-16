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

const {generateApiScenarios,buildCurlExample,buildFetchExample}=require("../api-tool.js");
test("API helper creates method-aware positive and negative scenarios",()=>{
 const cases=generateApiScenarios({method:"POST",endpoint:"/api/orders",auth:"bearer",body:'{"item":"book"}',contentType:"application/json"});
 assert.ok(cases.some(c=>c.title.includes("successful POST")));
 assert.ok(cases.some(c=>c.title.toLowerCase().includes("unauthorized")));
 assert.ok(cases.some(c=>c.title.toLowerCase().includes("malformed")));
 assert.ok(cases.every(c=>c.expected && c.steps));
});
test("API helper validates method and endpoint and generates safe examples",()=>{
 assert.throws(()=>generateApiScenarios({method:"TRACE",endpoint:"/orders"}),/method/);
 assert.throws(()=>generateApiScenarios({method:"GET",endpoint:""}),/endpoint/);
 assert.match(buildCurlExample({method:"GET",endpoint:"https://example.com/api/items",auth:"none"}),/curl/);
 assert.match(buildFetchExample({method:"GET",endpoint:"https://example.com/api/items",auth:"none"}),/fetch\(/);
});

const {formatJson,minifyJson,inspectJson}=require("../json-tool.js");
test("JSON formatter formats valid JSON and supports indentation",()=>{
 assert.equal(formatJson('{"a":1,"b":[true,false]}',2),'{\n  "a": 1,\n  "b": [\n    true,\n    false\n  ]\n}');
 assert.match(formatJson('{"a":1}',4),/    "a"/);
});
test("JSON formatter rejects empty and malformed input",()=>{
 assert.throws(()=>formatJson("  "),/Paste JSON/);
 assert.throws(()=>formatJson('{"a":}',2),/Invalid JSON/);
 assert.throws(()=>formatJson('{"a":1}',3),/Indent/);
});
test("JSON minifier and inspection report valid JSON details",()=>{
 assert.equal(minifyJson('{ "a" : 1, "b": [2, 3] }'),'{"a":1,"b":[2,3]}');
 assert.throws(()=>minifyJson("{bad"),/Invalid JSON/);
 assert.deepEqual(inspectJson('{"x":1,"y":2}'),{formatted:'{\n  "x": 1,\n  "y": 2\n}',valid:true,type:"object",characters:13,keys:2});
 assert.equal(inspectJson('[1,2]').type,"array");
 assert.equal(inspectJson('null').type,"null");
});

const {compileRegex,findMatches}=require("../regex-tool.js");
test("regex tester finds matches and capture groups",()=>{
 const matches=findMatches("(\\w+)@(\\w+\\.\\w+)","gi","qa@example.com and support@qaflex.dev");
 assert.equal(matches.length,2);
 assert.equal(matches[0].match,"qa@example.com");
 assert.deepEqual(matches[0].groups,["qa","example.com"]);
});
test("regex tester handles no matches and invalid patterns",()=>{
 assert.deepEqual(findMatches("xyz","g","abc"),[]);
 assert.throws(()=>compileRegex("[","g"),/Invalid regular expression/);
 assert.throws(()=>compileRegex("x","gg"),/flags/);
 assert.throws(()=>findMatches("x","g","a".repeat(20001)),/too long/);
 assert.throws(()=>compileRegex("x".repeat(501),"g"),/too long/);
});
test("regex tester returns one match without global flag and advances zero-length matches",()=>{
 assert.equal(findMatches("a","i","A a").length,1);
 assert.ok(findMatches("(?=a)","g","aa").length<=100);
});
