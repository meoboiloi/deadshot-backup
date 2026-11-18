# Reverse-engineering report — `VM45.js` (deadshot.io)

Ngày: 2026-11-19 · Nguồn: `C:\Users\Administrator\Downloads\deadshot\VM45.js`

---

## 1. File này là gì

| Thuộc tính | Giá trị |
|---|---|
| Kích thước | 5.513.262 bytes (5,5 MB) |
| Dòng (raw) | 1.738 dòng, dòng rất dài |
| Cú pháp | `node --check` = **hợp lệ** (đây là JS chạy được) |
| Loại | Bundle client của game **DEADSHOT.io**, bị obfuscate bằng `javascript-obfuscator` (obfuscator.io) |
| Dấu hiệu | entry `(function anonymous($wwOPiY7Gww…, Object, DataView, requestAnimationFrame, … WebSocket, …) {`; string array 7.571 phần tử; decoder `o(a,b)`; rotate array; control-flow flattening (`while(!![])`) |
| Nhúng kèm | 1 bundle **browserify 34 module** ở cuối file = **msgpack-lite** (encode/decode packet), `int64-buffer`, `bufferish`, `event-lite`, `base64-js` |

Đối chiếu với tab live đang mở (`chrome-cdp vm-scripts`): trang có script cùng dạng,
`scriptId 13`, ~5.263.952 ký tự / 1.739 dòng. Bản bạn tải là **cùng kiến trúc, khác build/version một chút**.

> Đây là **client**. Các logic quyết định (damage, hit validation, kill, score, chống cheat) nằm ở server,
> không có trong file này. Client chỉ gửi input/packet và nội suy trạng thái nhận về.

---

## 2. Đã làm gì để dịch ngược

1. `webcrack 2.16.0` (có sẵn trong skill `chrome-cdp`, `node_modules\webcrack`):
   - deobfuscate string-array + control-flow + unminify + unpack browserify.
   - Kết quả: `deobf/deobfuscated.js` — **7.495.238 bytes, 177.900 dòng**.
   - Unpack: `deobf/index.js`, `deobf/codec*.js`, `deobf/read-*.js`, `deobf/node_modules/*` (34 module msgpack-lite).
2. Script phân tích: `analyze.js`, `map.js` → `analysis-deobf.json`, `map.json`
   (URL, WebSocket, keyword, line anchor).
3. Kiểm tra chéo trên tab live bằng `chrome-cdp` (`vm-scripts`, `snapshot`, `canvas`).

### Cảnh báo khi đọc bản deobf

- `deobf/deobfuscated.js` **không chạy lại được**: webcrack sinh 1 lỗi
  `Illegal 'use strict' directive in function with non-simple parameter list` (dòng 101568).
  Chỉ dùng để **đọc**. Bản chạy được là `VM45.js` gốc.
- **Tên biến sau deobf là rác**: obfuscator mã hoá cả property name qua string array,
  mà array này lại trộn danh sách từ tục dùng cho chat filter → tên giải ra thành
  `assface`, `timbernigger`, `cloudflareinsights.com`, `fu&kin`…
  → **Đừng tin tên identifier**, hãy bám theo **string/URL/số dòng** và cấu trúc.
- Các chuỗi thật (URL, tên setting, shader, tên file asset) vẫn đọc được.

---

## 3. Bản đồ logic (số dòng trong `deobf/deobfuscated.js`)

| Vùng | Dòng | Nội dung |
|---|---|---|
| Wrapper + string table | 1–29 | Entry `anonymous(...)`, 7.571 string, helper private-field, `battle_royale_enabled=false` |
| gl-matrix (vec/mat) | ~3.500–16.000 | `vec3`, `mat4`, `quat`… |
| Custom GL lib (`gl3`) | ~7.000–16.000 | quản lý GL context, gamepads, mesh, texture |
| **three.js core** | ~16.000–41.700 | `WebGLRenderer` (20.446), materials, lights, shadows, `AudioListener` (36.925) |
| Loaders | ~42.000–46.000 | GLTF (42.311), DRACO (42.734, worker 44.727), KTX2/Basis (45.546+) |
| UI / menu / font / CSS | ~46.500–53.000 | font atlas, layout, shop UI, sprays |
| Asset & skin definitions | ~53.000–62.000 | weapon skins (`aZG`, `aZM`), rarity, audio clips (`gun_*_reload` 53.775+) |
| Localization | 61.885 | `LANG_ROWS` (en/es/hi/…); có label `Auto Shoot`, `Trigger Activation` |
| **In-match netcode (`game2`)** | **57.600–58.000** | `msgpack.decode` frame (57.672), packet dispatch theo `t`, nội suy entity, `game2.ws.send(msgpack.encode(...))` (57.749) |
| `game2.socket` | 56.003 | tạo `new WebSocket(ip)` cho **server trận đấu** |
| Hitbox / map block | 98.466–98.634 | tính hitbox từ block/map |
| Settings | 103.388 | key: `lookSensitivityX/Y`, `adsMultiplier`, `invertMove/Look`, `triggerThreshold`, `vibration…` |
| Auth token | 63.125 | `localStorage.authToken` / `sessionStorage.fireember` |
| Cookie helpers | 105.314–105.347 | set/read/URL-decode cookie |
| Login | 114.619–115.001 | `pkgLoginWorker`, `LoginEnvelope` (114.719), worker create | 
| Google OAuth | 114.426–114.442 | `google.accounts.oauth2.initTokenClient` |
| Xsolla (shop) | 112.672–112.770 | widget `cdn.xsolla.net`, `store.xsolla.com/api/v2/...` |
| Error reporting | 135.600–135.9xx | `window.onerror` → gom stack/url, gửi `error.deadshot.io` |
| CrazyGames SDK | 136.380 | nạp `sdk.crazygames.com/crazygames-sdk-v2.js` |
| **Matchmaker / Party** | **166.497–168.500** | stall-detect, reconnect backoff, chọn URL, connect packet, admission |
| Main loop | 170.741 | `requestAnimationFrame(dxy)` |
| gtag | 173.483 | `googletagmanager.com/gtag/js?id=UA-87346685-5` |
| msgpack instance | 174.167 | `dyp.msgpack = dyo()` (msgpack-lite) |
| int64/browserify | 177.6xx–177.900 | `int64-buffer` (`Int64BE/LE`) |

### Neo chính xác cho matchmaker (nếu cần đọc tiếp)

- **167.658** `dub = new dax("wss://matchmaking.deadshot.io/ws")` — tạo socket matchmaker
- **167.689** chọn `wss://party.deadshot.io/ws` khi `party` bật
- **167.741** `dub.send(msgpack.encode(dud))` — packet connect/handshake
- **168.096–168.097** `msgpack.decode(...)` — nhận packet matchmaker
- **168.346** `POST https://matchmaking.deadshot.io/admission` (`Content-Type: text/plain`, body = token)
  → nếu `403` + `dm == "vpn"` ⇒ chặn VPN (`duy()`, thông báo *"VPNs are not allowed"*)
- **137.437** `https://matchmaking.deadshot.io/pingtargets`
- **105.436** `GET https://matchmaking.deadshot.io/playercount`

### Neo cho trận đấu (game2)

- **57.672** `msgpack.decode(new Uint8Array(message.data))` → mảng packet
- **57.7xx** `game2.…[packet.t](packet)` — bảng handler packet (server → client)
- **57.749** `game2.ws.send(msgpack.encode(...))` — client → server
- **56.003** `game2.socket(ip, ...)` — tạo WebSocket trận
- **164.623** `du2 = dy8.fireRate` — dùng `fireRate` của weapon khi xử lý bắn

### Setting "autoshoot" (mobile)

- **138.065**: `id: "autoshoot"`, `mobileOnly: true`, `default: true` → đây là **hỗ trợ điều khiển mobile**
  (tự bắn khi tâm ngắm vào địch), **không phải aimbot/cheat**. Label UI ở **61.885**.
- `SelfAimSmg` (127.781 v.v.) là **tên texture/skin** trong shader, không phải module aim.

---

## 4. Mạng & giao thức

**WebSocket**
- `wss://matchmaking.deadshot.io/ws` — matchmaking mặc định
- `wss://party.deadshot.io/ws` — khi vào party
- socket trận đấu: `game2.socket(ip)` (binary `arraybuffer`, packet = **msgpack**)

**HTTP**
- `POST https://matchmaking.deadshot.io/admission` — token, kiểm tra VPN (403)
- `GET https://matchmaking.deadshot.io/playercount`
- `GET https://matchmaking.deadshot.io/pingtargets`
- `https://login.deadshot.io`, `https://testlogin.deadshot.io`
- `https://error.deadshot.io/{error,netfeel,texrefetch,login,matchmaking,framespike}`
- `https://store.xsolla.com/api/v2/project/<id>/...`, `https://cdn.xsolla.net/...` (shop)
- `https://www.googletagmanager.com/gtag/js?id=UA-87346685-5` (analytics)
- `https://sdk.crazygames.com/crazygames-sdk-v2.js` (portal)
- `https://hb.vntsm.com/...` (ads), `https://now.gg/play/...` (portal)

**Packet**
- Frame binary → `msgpack.decode` → mảng `{ t, ... }`
- `t` tra bảng handler (`game2.II11iI1lI1I(type, fn)` đăng ký)
- Outbound: buffer trong `game2.O?O?O?I1iO?Il`, mỗi tick `msgpack.encode` rồi `ws.send`

---

## 5. Những gì KHÔNG có trong file

- **Damage / headshot / kill / score / hit-registration thật** → server. Client chỉ gửi bắn + di chuyển,
  nhận state và nội suy.
- **Aimbot / wallhack / anti-cheat nâng cao**: không thấy. Chỉ có:
  - `window.onerror` → error reporting
  - stall detection (166.497+)
  - chặn VPN qua `/admission`
  - chat profanity filter (danh sách từ tục trong string array)
- Không có mã lạ kiểu đánh cắp cookie/token gửi ra ngoài: các endpoint đích đều là
  deadshot.io / xsolla / google / crazygames / ad networks.

---

## 6. Cách đọc tiếp

```powershell
# tìm string rồi nhảy tới dòng
rg -n "matchmaker-queue" "C:\Users\Administrator\Downloads\deadshot\deobf\deobfuscated.js"
# xem 1 vùng
$p="...\deobf\deobfuscated.js"; $l=Get-Content $p -Encoding UTF8; $l[167658..167760] -join "`n"
```

Với runtime (tab live), dùng skill `chrome-cdp`:
`node cli.js search-sources <query>`, `traffic`, `ws-frames`, `break`…

---

## 7. Kết luận ngắn

- `VM45.js` = **client bundle của deadshot.io**, obfuscate obfuscator.io, có nhúng msgpack-lite.
- "Logic" của game nằm rải trong bundle: **netcode ở 57.6k & 166.5k–168.5k**, **engine/render ở 16k–46k**,
  **auth ở 63k & 114k**, **setting/UI ở 103k & 61.9k**, **vòng lặp chính ở 170.7k**.
- Phần quyết định trận đấu (damage/kill) **không nằm ở client**.
