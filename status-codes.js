(function(root){"use strict";
const STATUS_CODES=[
[100,"Continue","Informational","The server received request headers; the client may continue.","Usually handled by HTTP infrastructure; inspect upload/Expect behavior if relevant."],
[101,"Switching Protocols","Informational","The protocol is changing as requested.","Check Upgrade headers and protocol support."],
[200,"OK","Success","The request succeeded; inspect the response body and headers for the expected result.","Assert schema, data, and side effects—not only the status."],
[201,"Created","Success","The request succeeded and created a resource.","Verify the new resource, identifier, and Location header where applicable."],
[202,"Accepted","Success","The request was accepted for processing, which may not be complete yet.","Poll the documented job/status endpoint rather than assuming completion."],
[204,"No Content","Success","The request succeeded and has no response body.","Assert an empty body where expected; do not parse JSON blindly."],
[206,"Partial Content","Success","The server returned part of a representation, commonly for range requests.","Check Content-Range and the requested byte range."],
[301,"Moved Permanently","Redirection","The resource has a permanent new URI.","Check Location and redirect/canonical URL behavior."],
[302,"Found","Redirection","The resource is temporarily available at another URI.","Check Location and how clients handle the redirect."],
[304,"Not Modified","Redirection","A cached representation can be reused.","Check conditional headers and cache behavior."],
[307,"Temporary Redirect","Redirection","A temporary redirect that preserves the request method.","Verify the client preserves method and body across redirects."],
[308,"Permanent Redirect","Redirection","A permanent redirect that preserves the request method.","Verify redirect target and method/body preservation."],
[400,"Bad Request","Client Error","The server considers the request malformed or invalid.","Inspect payload syntax, required fields, query parameters, and headers."],
[401,"Unauthorized","Client Error","Authentication is missing or invalid.","Check token presence, expiry, issuer, and authentication scheme."],
[403,"Forbidden","Client Error","The server refuses access to this resource.","Check user roles, scopes, ownership, and authorization policy."],
[404,"Not Found","Client Error","The resource or endpoint could not be found.","Check URL, resource ID, environment/base path, and whether absence should be hidden."],
[405,"Method Not Allowed","Client Error","The resource does not support this HTTP method.","Check the API contract and the Allow header if provided."],
[408,"Request Timeout","Client Error","The server timed out waiting for the request.","Check network latency, client upload behavior, and timeout settings."],
[409,"Conflict","Client Error","The request conflicts with the current resource state.","Check duplicate creation, version conflicts, and state preconditions."],
[410,"Gone","Client Error","The resource is no longer available and this may be permanent.","Check deletion lifecycle and whether clients should stop retrying."],
[412,"Precondition Failed","Client Error","A request precondition was not met.","Check ETag and conditional request headers."],
[413,"Content Too Large","Client Error","The request body exceeds a configured size limit.","Check payload size and server/proxy limits."],
[415,"Unsupported Media Type","Client Error","The server does not support the request body's media type.","Check Content-Type and supported formats."],
[422,"Unprocessable Content","Client Error","The request syntax is understood but its content cannot be processed.","Inspect field-level validation errors and domain rules."],
[429,"Too Many Requests","Client Error","The client has sent too many requests in a period.","Check rate limits, Retry-After, throttling, and retry/backoff behavior."],
[500,"Internal Server Error","Server Error","The server encountered an unexpected condition.","Correlate request IDs with server logs; avoid exposing stack traces."],
[501,"Not Implemented","Server Error","The server does not support the requested functionality.","Check supported methods/features and server/proxy configuration."],
[502,"Bad Gateway","Server Error","A gateway received an invalid upstream response.","Check upstream health, gateway logs, and response validity."],
[503,"Service Unavailable","Server Error","The service is temporarily unable to handle the request.","Check maintenance/overload signals and Retry-After."],
[504,"Gateway Timeout","Server Error","A gateway did not receive an upstream response in time.","Check upstream latency, network path, and timeout budgets."]
];
function filterStatusCodes(query,category){const q=String(query||"").trim().toLowerCase(),cat=String(category||"all");return STATUS_CODES.filter(x=>(cat==="all"||String(Math.floor(x[0]/100))===cat)&&(!q||x.some(v=>String(v).toLowerCase().includes(q)))).map(x=>({code:x[0],meaning:x[1],category:x[2],description:x[3],tip:x[4]}));}
if(typeof module!=="undefined"&&module.exports)module.exports={STATUS_CODES,filterStatusCodes};
if(!root.document)return;
const $=id=>root.document.getElementById(id);
function render(){const found=filterStatusCodes($("search").value,$("category").value),rows=$("rows");rows.replaceChildren();for(const s of found){const tr=root.document.createElement("tr");const vals=[s.code,s.meaning,s.description,s.tip];for(let i=0;i<vals.length;i++){const td=root.document.createElement("td");if(i===0){td.className="code";td.textContent=vals[i];}else if(i===1){const badge=root.document.createElement("span");badge.className="badge "+({Success:"success",Redirection:"redirect","Client Error":"client","Server Error":"server"}[s.category]||"");badge.textContent=vals[i];td.append(badge);}else td.textContent=vals[i];tr.append(td);}rows.append(tr);} $("count").textContent=found.length+" of "+STATUS_CODES.length+" status codes shown."; $("empty").hidden=found.length!==0;}
$("search").addEventListener("input",render);$("category").addEventListener("change",render);render();
})(typeof globalThis!=="undefined"?globalThis:this);