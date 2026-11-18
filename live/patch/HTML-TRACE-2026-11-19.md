# Electron response override — bounded findings

- Fresh `https://deadshot.io/` download matches `cache/index.html` byte-for-byte
  (970849 bytes, SHA-256 `2809d49e22a8dff7c9ec256e2d41c58a9fdf166a8e99002ed5b51c7f50a9210a`).
  Fresh `/final.pkg` also matches `cache/final.pkg` (1733477 bytes, SHA-256
  `e3f1ecfd8d34d9fa101449b38cf89575548b7ba277c87fa7cbd5da72e345bbe9`).
- `vai-lon-ds/main.js` now serves local HTML, final.pkg and final_legacy.pkg.
  CDP `Network.getResponseBody` verified local HTML and pkg response hashes.
- Baseline local original HTML + original pkg: 9 canvases, no load error.
  HTML with only `if(!Fpw6Vv){throw` changed to `if(!1){throw`, plus original
  pkg: 9 canvases. Same HTML plus repacked pkg: no canvas; a paused exception
  is `TypeError: The encoded data was not valid` at `fQ_WXq` (fatal TextDecoder).
- HTML with that hash patch plus a **same-length** replacement of the return
  value in `pV4CCHP` (`Xp3glO` -> `true  `) fails even with original pkg.
  Non-invasive CDP breakpoints at the loader's catch handler show
  `pkg:decode` / `package metadata missing`; `XAPVga` and `KKCzvQR` are set to
  true *inside the catch path*, so those flags are symptoms, not proof of
  an independent anti-tamper root cause. With the **patched** pkg, the same
  edit reaches `pkg:signature` / `invalid`. Those are two different failure
  states; neither proves that `pV4CCHP` is the sole signature gate. Do not
  use this verification edit.
- A global `SubtleCrypto.prototype.verify` stub inserted in HTML reports
  installation but does not establish that the loader used it.
- Static code at `live/loader-deobf.js:11957-11977` identifies `pV4CCHP`
  as **AES-GCM decrypt**, not a boolean signature verification: it imports a
  raw key, decrypts with an IV from the first 12 bytes, and returns
  `new Uint8Array(Xp3glO)`, or an empty Uint8Array on failure. A CDP breakpoint
  immediately before return observed a non-boolean result on the original pkg.
  Replacing this byte array with `true` destroys the downstream metadata input;
  the resulting `package metadata missing` is therefore an artifact of the
  incorrect edit, not evidence of an independent guard.
- A separate clean Electron app with **no protocol handler, UA masking, or
  adblock** loaded `https://deadshot.io/` from the network (HTTP 200, 971210
  bytes, SHA-256 `182e63b2bcbfa87dd49b65caecc2abf112635d42bdfad965a4b1de89a7146940`)
  and `final.pkg` (HTTP 200, 1733477 bytes, SHA-256
  `e3f1ecfd8d34d9fa101449b38cf89575548b7ba277c87fa7cbd5da72e345bbe9`).
  After 12 s it had 9 canvases, no `#dsPkgLoadError`, and a UA containing
  `Electron/43.0.0`. This disproves a blanket Electron load block for that
  run; it does not establish acceptance of modified packages or every later
  game feature. The current live HTML differs from the earlier cached HTML;
  keep captures paired by response hash.
- `webcrack` on the loader produced a deobfuscated JS file; on the JS portion
  of the unpacked pkg it found 34 Browserify modules. The pkg has a 969389-char
  non-JS prefix before `var battle_royale_enabled`; Prettier fails on the
  entire unpacked payload and succeeds on the JS suffix. Structural `ast-grep`
  found the hash guard in `loader-deobf.js`; `rg` located the renderer and
  wrapper call sites. These transformations are analysis artifacts, not
  confirmed runnable replacements.

The above remained unresolved for the historical length-changing patch.
The smaller controlled experiment below resolves the load path for one
same-length edit, not the arbitrary-length packaging format.

## Controlled follow-up: 5-byte game-logic edit

- `repack-same.pkg` decrypts and gunzips to the **same raw 6197165 bytes**
  (SHA-256 `c010bb6b72cba85e07164c5c29ec89d22dd71dd4534b87d8f241fcf89b10c8b5`)
  as the original. With HTML only bypassing the hash guard, CDP observed
  `pkg:signature / invalid` and 0 canvases: the signature gate is independent.
- A breakpoint in `I0Dy3ft` at the condition
  `if(yBqEh3s===amjxY4[I0Dy3ft(0xd20,lixLAZ[0x3])])`
  observed `signatureLength:64`, a zero-filled signature,
  `verifyResult:0`, and `failureSentinel:0` for the modified pkg.
  Original pkg with only the hash guard changed reached this same breakpoint
  with `verifyResult:1`, `failureSentinel:0`, 9 canvases. This is the actual
  failure branch, not the AES-GCM decrypt function.
- `build-minimal.js` changes *only* the game source's
  `var battle_royale_enabled=false;` to
  `var battle_royale_enabled=true ;` (five changed bytes, **no length change**)
  in the original **raw** gunzipped buffer. It repacks AES-GCM and applies only
  the hash guard and the proven signature-failure guard to the matched HTML.
  `node live/patch/build-minimal.js --install` reconstructs the two local
  responses and the legacy pkg fallback. No global crypto override is used.
- Post-install CDP `Network.getResponseBody` on a fresh reload verified
  `index.html`: 970802 bytes, SHA-256
  `2000736ae87e15556f206dbcdfb307339a34ca5b0354a51854c01c56ad06cbf0`;
  `final.pkg`: 1739336 bytes, SHA-256
  `e2c4428c69e57246dbdc9f699573689a60f6023257cc2ac5ad87d27bddac9a8c`
  (the random AES-GCM IV changes the package SHA each rebuild).
  The renderer then had 9 canvases, no load-error overlay, and no captured
  uncaught exceptions or console messages. A debugger breakpoint immediately
  after the new game-source assignment observed
  `{ "type":"boolean", "value":true }`, proving that edit executed.
- **Limits:** an insertion of 32 bytes after that assignment yielded
  `SyntaxError: Unexpected string` and 0 canvases. Appending a marker to the
  tail executed it (`window.__deadshotModLoaded === true`) and produced canvases
  but also an uncaught `SyntaxError`. Thus neither length-changing edit was
  accepted as clean. The historical `build.js` is not a validated builder;
  at that point, the length-changing metadata constraint was not understood.

## Length-changing injection: metadata relocation

- A CDP breakpoint immediately before `E3uxI4`'s `new Function(...)` captured
  its full final argument, the generated game source. Without relocating
  metadata, a 32-byte insertion produced invalid source within its first
  string table: `var eR7=liιıIllIiles',...` instead of a string literal.
  Offline `vm.Script` parsing reported `SyntaxError: Unexpected string`.
  This is a broken code-generation input, **not** a newly discovered
  integrity rejection.
- The raw plaintext's 969389-byte ASCII prefix has four `|`-separated fields
  terminated by `;`: substitution descriptions, `position:index` entries,
  position ranges, and typed position operations (`B/W/T/S/J/H/N/D/P/O/I`).
  `live/loader-deobf.js:12490-12641` parses metadata and applies substitutions
  at byte offsets in the JS suffix. The final number in `S/D/P` and one
  exceptional `J` operation is a flag, not an offset. Shifting numeric
  positions **at or after the insertion point** by its UTF-8 byte length
  repairs the malformed generated script; leave substitution IDs and flags
  alone. This is confirmed at the existing injection point (immediately
  after `battle_royale_enabled`), not established for arbitrary insertion
  points within an operation's span.
- `node live/patch/build-length-aware.js --install` regenerates the patched
  HTML and pkg from `cache/`, inserts a default 33-byte runtime marker,
  relocates 90704 position values, verifies raw pack/unpack equality and
  installs the responses in `vai-lon-ds/assets/`. Optional
  `--inject-file path` reads a local JS snippet and inserts it at this
  supported point; it parses the snippet but does not execute it during build.
  A separate **108-byte** custom snippet set
  `window.__deadshotModDetail = {version: 2, note: "length-aware test"}`.
  CDP read that value in the renderer; a breakpoint in the generated game
  script also read `battle_royale_enabled === true`. Reload had 9 canvases,
  no load overlay and no captured exception/console message.
- Final default build, reinstalled without a temporary custom snippet:
  `insertedBytes:33`, `relocatedPositions:90704`, HTML response
  SHA-256 `2000736ae87e15556f206dbcdfb307339a34ca5b0354a51854c01c56ad06cbf0`,
  pkg response SHA-256
  `243de9dbfdcc09ab8753177f4364ed88602a0575c7ddf126c71a77f4f1801ed7`.
  CDP reload: 9 canvases, no `#dsPkgLoadError`, zero captured exceptions
  and console messages; `window.__deadshotModLoaded === true`. AES-GCM IV is
  random, so the pkg hash changes on each rebuild.

Remaining limits: no game session/network-play validation (the user plays),
no guarantee all possible edits or entry points work, and the loader may
perform checks outside this observed startup path. This validates a
length-changing JS injection at one known-safe boundary.

## Second insertion point: game2.update

- `build-length-aware.js` gained `--at start|game2-update`. The
  `game2-update` point inserts **inside** `game2.update=function(){...}` so the
  snippet runs every frame, and it also rewrites the frame clamp
  `Math.max(cMW.C716_2w1(),30)` to `...,31)`. Exactly one
  `game2.update=function(){` assignment must exist.
- Build output: `insertion:"game2-update"`, `offset:2228930`,
  `relocatedPositions:56195`. The committed example
  `live/patch/inject-frame.js` (342 bytes) produced `pkgBytes:1739353` and was
  served at SHA-256
  `0eed3ad5f960dcd2e9181bb1132811d110c8f16121837e7df411f92863f1b86b`
  (random IV, so a rebuild changes this).
- The generated game source captured immediately before `new Function`
  parses with `vm.Script` and contains
  `game2.update=function(){window.__deadshotUpdateRuns = ...` followed by
  `var currentFPS=Math.max(cMW.ӏIıӏiιӏӏ(),31);`. The original
  `(),30)` clamp no longer appears anywhere in that source, so the logic edit
  survived metadata substitution and repacking.
- Browser-side state on the menu: 9 canvases, no `#dsPkgLoadError`, no
  exceptions or console errors, `battle_royale_enabled === true` at the
  assignment. `window.__deadshotUpdateRuns` stayed **0** over 42 s, and a
  3 s CPU profile showed 4942/4944 samples idle with no game frames, so
  `game2.update` (and the per-frame snippet) is not invoked until a match
  starts. That part needs the user to play; it is not evidence of failure.
- A 42 s run of the patched app recorded no overlay and no exceptions.
  Network failures in that run were `ERR_UNSAFE_REDIRECT` (script) and
  `ERR_UNEXPECTED` (fetch). The **unmodified** baseline app in the same
  environment recorded `ERR_NAME_NOT_RESOLVED`, `ERR_FAILED` and
  `ERR_BLOCKED_BY_ORB`, so those request failures are environmental, not a
  mod detection result.

## Delayed guard after load

- `live/loader-deobf.js:957` area schedules
  `setTimeout(function(){ return kOXf0Y0({get flag(){return XAPVga},
  method(){ return AJL9rfl(); }}, ...) }, 0x2ee0)`; `kOXf0Y0`
  (`live/loader-deobf.js:1704`) calls the method only when the flag is
  `=== true`, and `AJL9rfl` reaches `KnmazS` (the `#dsPkgLoadError` overlay).
  So a *delayed* overlay is possible 12 s after load if `XAPVga` is true.
- A CDP breakpoint on that timer callback fired in the patched app and read
  `{"XAPVga":false,"KKCzvQR":false,"F4FeIV":true}`; the page still had
  9 canvases and no `#dsPkgLoadError`. The delayed path therefore runs but
  stays inactive for this mod.
- Probe hygiene: an earlier probe set a breakpoint inside the hot
  `if(XAPVga===...||KKCzvQR){AJL9rfl()}` path, which left the renderer paused
  when the probe process was killed and made further CDP commands time out.
  Restarting the Electron app recovered it. Trace with a single, cold-path
  breakpoint; do not kill a probe while the renderer is paused.

## Gate matrix for the current modded pkg

Computed from `cache/index.html` with one to two guard substitutions while
keeping the pkg fixed (`live/patch` has no test runner; the probe used CDP
breakpoints at the loader catch handler):

| HTML served | caught stage | canvases |
| --- | --- | --- |
| original | `pkg:signature / invalid` | 0 |
| hash guard bypassed only | `pkg:signature / invalid` | 0 |
| signature guard bypassed only | `pkg:decode / pkg-integrity` | 0 |
| both guards bypassed | none | 9 |

Both gates therefore block a repacked pkg: the signature check runs first,
and the `pkg-integrity` hash check is reached once the signature gate is
bypassed. The two HTML substitutions are the complete set needed for this
pkg in the observed load path; no third loader gate fired.

## In-bundle anti-tamper sites (current modded pkg)

Static enumeration of `cache/final.pkg` (source offset 969389 onward) found
exactly one occurrence of each site that `build.js` used to blanket-disable:

- `var dax=window[` at text offset 5437459 (after the prototype check loop),
- `if(cXu)var daC` at 5437683,
- `(dru||dav)&&alert(` at 6074927.

The surrounding code is a native-`toString` probe: for `dat = [window,
document, document.body]` it reads each prototype's `toString`, requires the
substring/length markers and `"Function" in <target>`, and sets `cXu`;
the second phase does the same for one `window[...]` property and sets `dav`.
`dru = !!cXu` later feeds `(dru||dav)&&alert(...)`. A wrapper on those
prototypes/`window.WebSocket` is what this detects.

Runtime check with cold-path CDP breakpoints on the patched app:

| breakpoint | hit | values |
| --- | --- | --- |
| `KKCzvQR=XAPVga===lixLAZ[0xb3];` | yes | `XAPVga:false, KKCzvQR:null, F4FeIV():true` |
| `if(XAPVga===...||KKCzvQR){AJL9rfl()}` | yes | `XAPVga:false, KKCzvQR:false, F4FeIV():true` (guard false) |
| `var dax=window[` (after `dav` computed) | yes | `cXu:false, dav:false, cSR:true, prop:"WebSocket"` |
| `if(cXu)var daC` | yes | `cXu:false, dav:false, prop:"WebSocket"` |
| `(dru||dav)&&alert(` | yes | `dru:false, dav:false` (no alert) |

So the anti-tamper branch does execute on every load, the probe inspected
`window.WebSocket`, found no patched native `toString`, and did **not** call
`alert`. Those three `build.js` substitutions are therefore unnecessary for
this mod and were never required by the observed flow; they remain
documented only as history. The page still showed 9 canvases and no
`#dsPkgLoadError` after the run.

Loader-side flag setup was also traced: `XAPVga` starts false, `KKCzvQR` is
computed as `XAPVga===<sentinel>` and stays false because `F4FeIV()` returns
true, so both the immediate and the 12 s guards remain inert without any
extra HTML edit beyond the two package-verification guards.

### What the bundle probe actually inspects

Decoding the identifier strings at the paused frame gives the concrete test:

```
dat = [window, document, document['body']]
for each dau in dat:
  dy5 = dau['addEventListener']['toString']()
  cXu = false
  cWl && (cXu = true)
  (dy5.indexOf('[native code]') == -1 ||
   dy5.indexOf('function addEventListener() {') == -1) && (cXu = true)
  dy5.length != 0x31 && dy5.length != 0x2d && (cXu = true)
  dau['addEventListener']['hasOwnProperty']('toString') && (cXu = true)
  'prototype' in dau['addEventListener']['toString'] && (cXu = true)
  if (!cXu) break

daw = window['WebSocket']['toString']()
(daw.indexOf('[native code]') == -1 || daw.indexOf('WebSocket() {') == -1) && (dav = true)
daw.length != 0x2a && daw.length != 0x26 && (dav = true)
window['WebSocket']['hasOwnProperty']('toString') && (dav = true)
'prototype' in window['WebSocket']['toString'] && (dav = true)
...
dru = !!cXu
(dru || dav) && alert(translate(...))
```

Runtime values at those sites were `cXu:false, dav:false, cWl:false,
cSR:true, prop:"WebSocket", toStringKey:"toString",
protoKey:"addEventListener", indexOfKey:"indexOf",
hasOwnKey:"hasOwnProperty", markerA:"[native code]",
markerB:"function addEventListener() {", inKey:"prototype",
markerC:"WebSocket() {"`.
`cWl` false means the `cWl && (cXu = true)` branch never forces the flag, and
`window.WebSocket.toString()` has length 38 (`0x26`), one of the two accepted
lengths. So both branches stay false and `alert` is not called.

The loader's obfuscator global check (`sLk35j`, `live/loader-body.js` offset
~229.5k) tries `globalThis`, `YIPbqrW["ychEIJ2"]`, `window` and
`new Function("return this")()`. Read without breakpoints in the patched app,
`new Function('return this')()` still returns the real `window`,
`Function.name === 'Function'`, `"".__proto__.constructor.name === 'String'`
and `Function.prototype.toString` still reports `[native code]`. No proxy is
detected, so this branch needs no loader edit either.

Probe hygiene note: arming a breakpoint on the loader's own init statement
(`AdG24v4(RW3nTYi=sLk35j()||{}, ...)`) left the renderer paused and later CDP
commands timed out; restarting the Electron app recovered it. Read that
check's inputs with `Runtime.evaluate` instead of breaking inside loader init.

## Writer sweep and remaining probe sites

Static counts (`live/loader-body.js` = 961204 chars; game source = 5227776
chars starting at pkg offset 969389):

| token | loader | game |
| --- | --- | --- |
| `XAPVga` | 10 | 0 |
| `KKCzvQR` | 13 | 0 |
| `_x0Gwwa` | 3 | 0 |
| `alert(` | 0 | 13 |
| `toString` | 4 | 47 |
| `prototype` | 4 | 978 |
| `Function(` | 2 | 10 |

Every `XAPVga=` occurrence in the loader is one of: the declaration
(`let XAPVga=lixLAZ[0xb3]`), proxy setter A (loader offset 932786), the
`KKCzvQR=XAPVga===lixLAZ[0xb3]` derivation (953598, a read), proxy setter B
(954042), and the immediate guard (956684, a read). Decoding the constant
table offline (`lixLAZ` literal evaluated in `vm`) gives
`lixLAZ[0xb3] === true` and `lixLAZ[159] === false`, so the declared initial
value is `true` and the guard compares against `true`.

Runtime table for the current modded pkg (fresh app per probe run):

| site | hit | values |
| --- | --- | --- |
| `KKCzvQR=XAPVga===lixLAZ[0xb3];` (953598) | yes | `XAPVga:false, KKCzvQR:null, F4FeIV():true` |
| `KKCzvQR=XAPVga===lixLAZ[0xb3];` repeat run | yes | `XAPVga:false, KKCzvQR:false` |
| `if(_x0Gwwa){}` (953444) | yes | `_x0Gwwa:true` |
| `if(XAPVga===lixLAZ[0xb3]\|\|KKCzvQR){AJL9rfl()}` (956684) | yes | `XAPVga:false, KKCzvQR:false` (guard false) |
| 12 s timer callback (`kOXf0Y0` + `XAPVga`) | yes | `XAPVga:false, KKCzvQR:false` |
| setter A `{XAPVga=tROqsC4}` (932786) | once, during init | `XAPVga:true` before the write, argument `""` |
| setter B `{XAPVga=wvIEvB}` (954042) | not observed during load | — |
| game `cXu` / `dav` / `dru` / alert sites | yes | all `false`; alert not called |

`_x0Gwwa` decoded from the paused frame is **not** a devtools check:
`location.protocol === 'https:' && location.host.indexOf('ing') === -1`
(keys `["P52q4V","protocol","https:","host","indexOf","ing"]`), which is
true on `deadshot.io` over https. Its only consumer in this build is the
**empty** block `if(_x0Gwwa){}`, so it has no effect. No guard edit is
justified for it.

Game-side `alert(` sites: 12 are ordinary UI/error paths (reward-ad failure,
popup blocked, item purchase errors, WebGL failure, client out of date,
maintenance, match full, clipboard failure). The 13th (game source offset
5105538) is the anti-tamper alert gated by `(dru||dav)`, traced above as not
firing. Game `Function(` sites are shader/texture helper names
(`getTexelDecodingFunction`, `getTexelEncodingFunction`, …), not dynamic code.
The obfuscator self-defending IIFE near game offset 283487 executes on load
and only bails out when its own `toString()` contains a newline; our edit is
inside `game2.update`, and no exception was recorded across the 42 s runs, so
it does not trip.

Honest gap: setting a breakpoint exactly on the yaOnmLg proxy setter bodies
twice stalled the CDP session (no pause logged, later commands unresolved);
restarting the Electron app recovered it each time. The guard and 12 s timer
reads are the authoritative outcome — both are false with no overlay — so no
loader guard was added. A restart is required before re-running any probe
that leaves a breakpoint armed.

## Final build re-check and in-match sampling

Capture of the generated source for the **currently installed** build
(`inject-frame.js`, 342-byte snippet), taken immediately before
`new Function`:

- 5501097 bytes / 5234897 chars, `vm.Script` parse **OK**;
- `game2.update=function(){// Example mod body ...` with the injected body at
  the top of the function (`markerInBody: true`);
- frame clamp is `Math.max(<name>(),31)`; the original `(),30)` does not occur
  anywhere in the generated source (`clamp31:true, clamp30:false`).

Setter B re-check: a third attempt used a **fresh app**, a **single** cold
breakpoint on `{XAPVga=wvIEvB}` and `Debugger.disable` before exit. The
session again produced no pause record and no final state; restarting
Electron recovered it. So that specific location is not safely breakable with
this loader, and setter B remains **unobserved**, not observed-clean. Its
effect is bounded by the guard and 12 s timer readings, which are `false` with
no overlay for this build.

In-menu sampling, 60 s at 5 s intervals on the final build (fresh app):

```
t=0  runs:0 canvases:9 error:false alerts:0
t=55 runs:0 canvases:9 error:false alerts:0
framesAdvanced:0  matchObserved:false  exceptions:[]
```

`alert` was wrapped after load to count calls; count stayed 0. The page stays
in the menu with 9 canvases, no `#dsPkgLoadError`, no captured exception, and
`game2.update` never runs — so the in-match path (`__deadshotUpdateRuns`
incrementing, per-frame clamp) is **still unverified** and cannot be verified
without starting a match, which is the user's step. The sampler is
`deadshot-match-sample.mjs`; run it while playing to capture `runs`,
`canvases`, `error`, `alerts`, and exceptions for the in-match window.






## Legacy ESP/aim patcher against the current build

The old patcher (index.js anchors + deadshotWindow.updateEsp bridge) does
not apply to the current pkg. Dry-run of its five anchors against
cache/final.pkg (game source 5209424 chars):

```
SKIP: ESP Screen Hook (pattern not found)
SKIP: ESP World Hook (pattern not found)
SKIP: Aimbot Hook (pattern not found)
SKIP: Name/Clan Hook (pattern not found)
SKIP: Sniper Auto Unscope (pattern not found)
applied: 0 / 5
```

Unique identifiers from the old build are absent in the current source:
a1U, a1D, a1I, a1K, a1L, a1M, a1N, rI7Jw7nY8wvklBFX, nuk4d1gAcGeM9x3,
z8QiBT6N1VZn, mspCz0VG3chm, hemYws8AM38, h11herJ2iH667GC3, r1yXFc9UK59Upy,
e55SmR8AbyLQhbeM, wnnm38W8uNT6wZP1, cA9bCsX9dNxf5W7, tQH6jrBORvv,
uRTRcOgxHma43zoa, mWJ3BenBltox. Short names that do survive (NL, S0, W2,
VZ, Zo, Zq, Zp, a1C) are generic minified locals reused across functions, so
matching them alone is meaningless.

The rendering bridge is also absent at runtime in this wrapper:
typeof globalThis.deadshotWindow === 'undefined' and
typeof deadshotWindow?.updateEsp === 'undefined', so even working hooks
would publish into nothing.

Equivalent logic still exists and can be re-targeted. The world-to-screen
(NDC) projection is at game offset ~3956948:

```js
dYL = 1 / (dy2['H78K_2ue'] * (window['innerWidth'] + 1)),
dYM = 1 / (dy2[<h>] * (window['innerHeight'] + 1));
return dXF[<a>] = 0.5 + (dYG - dYI) * dYL, dXF[<b>] = 0.5 + (dYG + dYI) * dYL, ...
```

and game2.update is still a per-frame function we can inject into (proven
above). Rebuilding the ESP therefore needs: (1) new anchors derived from
this projection site, (2) a drawing path that does not exist yet in the
wrapper (preload/IPC or DOM-canvas overlay), and (3) the same
metadata-relocation pipeline used by build-length-aware.js so the changed
length still loads.

### Setter B resolved without pausing

Breaking on {XAPVga=wvIEvB} deadlocked three times, so the fourth attempt used
breakpoint conditions instead of pauses: each site got
`condition: (window.__hits[name]=(window.__hits[name]||0)+1,false)`, which
records the hit and returns false (no pause, no deadlock). Result after a
fresh-app reload:

```
hits = { setterA: 1, x0Gwwa: 1, guard: 1 }
canvas: 9  error: false
```

The control counters prove the mechanism works, and setterB and setterKKC are
**absent from the map, i.e. never executed** during load. So the second
XAPVga/KKCzvQR writer is unreachable in this build (0 hits), not merely
unobserved; the only writer that runs is setter A, once, plus the initial
`let XAPVga = true` and the KKCzvQR derivation that ends false.

## Direct-canvas ESP renderer (no bridge)

The legacy ESP published to `deadshotWindow.updateEsp`, which this wrapper does
not expose. Replacement: `live/patch/inject-esp-canvas.js` draws in-page on a
fixed, full-screen 2D overlay canvas (`#__ovfEsp`, `pointer-events:none`,
`z-index:2147483000`), sized to `innerWidth x innerHeight x min(dpr,2)` and
kept in sync on every draw. No IPC, no preload, no bridge.

Stable data API added by the same snippet:

```js
window.__ovfUpsert(id, { screenX, screenY, size, team, hp, maxHp, name })
window.__ovfClear()
window.__ovfEspDraw(entries[])   // manual draw, also used by the tests
window.__ovfEspSetTeam(team)     // colours teammates green
```

`build-length-aware.js` gained `--at both --inject-start <file> --inject-update
<file>`, which relocates pkg metadata for both insertions (later offset first).
Current build: renderer at the opening statement, per-frame marker at the top
of `game2.update`, clamp `30 -> 31`.

Verified on the installed pkg (`final.pkg` SHA-256
`002afc4069f1f9ef0d99e4b39e30b3ed260bd26b40883b22d5a58d160904582a`):

```
hasRenderer:true  hasPublisher:true  hasFrameMarker:true
clamp31:true      clamp30:false
```

CDP on a fresh reload: `__ovfEspDraw([2 test entries])` returned `drawn:2`,
`framesBefore:0 -> framesAfter:1`, canvas `1264x681` (dpr-scaled),
`position:fixed`, `pointer-events:none`, `z-index:2147483000`,
`nonTransparentPixels:2014`, `loadError:false`, no exception or console
message. The page keeps its original 9 canvases plus the overlay.

Still open: the **data hooks**. The old anchors that produced per-enemy
`screenX/screenY` are gone, so the renderer currently receives nothing on its
own. Feeding it needs new hooks derived from the current projection code,
which must use the same metadata-relocation build path. The renderer and
publisher are ready for them; `__ovfUpsert` is the contract.

### Executing the injected update body from the menu

The menu never calls game2.update, which is why every earlier sample showed
runs:0. To prove the injected body is live anyway, a breakpoint *condition*
(no pause) stashed the game object:

```
condition: (window.__g2tmp=game2,false)   // captured: 118 keys
```

The object exposes `scenes` (56), `images`, `me` (id/score), `spectating:true`,
`positions`, `types`, `w44i_2qp`, `socket`, `renderer`, `frame`, `now`,
`createCanvas`, plus a `CanvasRenderingContext2D` field. `positions` and
`types` are empty on the menu (they fill while a match runs).

Clearing `window.__g2` and calling the captured `update()` once:

```
runsBefore:0 -> runsAfter:1        (injected body executed)
g2SetByInjectedBody:true           (window.__g2 = game2 ran)
g2IsSameObject:true
publishApi:"function"  entries:0  positions:0
call:"threw: <name> is not a function"   (menu state, expected)
canvas:9  error:false
```

So `live/patch/inject-frame-probe.js` does capture the real game object from
its own scope and call `__ovfPublishFromGame()`; the throw is the uninitialised
menu state after the injected lines, not a detection.

### Visibility / throttling finding

Before the wrapper change the renderer reported `document.visibilityState:hidden`
and rAF callbacks installed after load never fired. `vai-lon-ds/main.js` now
adds `disable-renderer-backgrounding`, `disable-backgrounding-occluded-windows`
and `disable-background-timer-throttling`; after that the page starts visible.
A direct probe `new Promise(r => requestAnimationFrame(r))` resolves
(`raf-fired`), so rAF is not paused; the earlier `frames:0` numbers came from
wrapping rAF after the game had already captured its own reference, not from a
sleeping compositor.

### What still needs a match

`positions`/`types` stay empty until a match starts, so the ESP has no entries
and `publishFromGame()` publishes nothing. Everything else is wired: renderer
(verified: drawn:2, 2014 painted pixels), publisher, game-object capture, and
the injected per-frame body. Starting a match is the only remaining step, and
it is the user's action.
