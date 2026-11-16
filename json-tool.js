(function(root){"use strict";
function formatJson(input,indent){
 const source=String(input==null?"":input);
 if(!source.trim())throw new Error("Paste JSON to format or validate.");
 let value;try{value=JSON.parse(source);}catch(e){throw new Error("Invalid JSON: "+e.message);}
 const spaces=Number(indent);if(![2,4].includes(spaces))throw new Error("Indent must be 2 or 4 spaces.");
 return JSON.stringify(value,null,spaces);
}
function minifyJson(input){const source=String(input==null?"":input);if(!source.trim())throw new Error("Paste JSON to minify.");try{return JSON.stringify(JSON.parse(source));}catch(e){throw new Error("Invalid JSON: "+e.message);}}
function inspectJson(input){const formatted=formatJson(input,2),value=JSON.parse(String(input));return {formatted,valid:true,type:value===null?"null":Array.isArray(value)?"array":typeof value,characters:String(input).length,keys:value&&typeof value==="object"&&!Array.isArray(value)?Object.keys(value).length:null};}
if(typeof module!=="undefined"&&module.exports)module.exports={formatJson,minifyJson,inspectJson};
if(!root.document)return;
const $=id=>root.document.getElementById(id);
const input=$("json-input"),output=$("json-output"),status=$("status");
function run(action){try{const raw=input.value;let result;if(action==="format")result=formatJson(raw,$("indent").value);else if(action==="minify")result=minifyJson(raw);else {const info=inspectJson(raw);result=info.formatted;status.textContent="Valid JSON · Type: "+info.type+" · "+info.characters+" input characters"+(info.keys===null?"":" · "+info.keys+" top-level keys");}output.value=result;if(action!=="inspect")status.textContent="Success. JSON "+(action==="format"?"formatted.":"minified.");}catch(e){status.textContent=e.message;}}
$("format").addEventListener("click",()=>run("format"));$("minify").addEventListener("click",()=>run("minify"));$("validate").addEventListener("click",()=>run("inspect"));
$("clear").addEventListener("click",()=>{input.value="";output.value="";status.textContent="Cleared.";input.focus();});
$("copy").addEventListener("click",async()=>{if(!output.value){status.textContent="Format or minify JSON first.";return;}try{await root.navigator.clipboard.writeText(output.value);status.textContent="Output copied.";}catch(_){status.textContent="Clipboard unavailable here. Select and copy the output manually.";}}); 
$("load-example").addEventListener("click",()=>{input.value=JSON.stringify({id:101,title:"Example API response",completed:false,tags:["qa","api"],metadata:{source:"QAFlex Studio",version:1}},null,2);status.textContent="Example JSON loaded.";});
})(typeof globalThis!=="undefined"?globalThis:this);
