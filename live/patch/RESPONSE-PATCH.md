# DEADSHOT — sửa source & nạp lại qua response (proxy)

Tài liệu này ghi lại **đúng những gì đã kiểm chứng trên build live 2026‑11‑19**
(Chrome 158, `https://deadshot.io/`), gồm cả các cách **không** hoạt động và lý do,
để không mất thời gian đi lại.

---

## 1. Kiến trúc thực tế (đã trace)

```
GET https://deadshot.io/                      (text/html, content-encoding: br, no-store)
  └─ inline <script> #1  (319 B)   tạo <link rel=preload as=fetch href="final.pkg?dr0t1GFI8r...">
  └─ inline <script> #2  (181 B)   performance.mark("dsPkgPreParse")
  └─ inline <script> #3  (~966 KB) LOADER (obfuscate, string table runtime)
       1. fetch("final.pkg?<build>")            ← same-origin, ~1.73 MB
       2. importKey(raw, AES-GCM key 32B, ["decrypt"])
       3. importKey(raw, Ed25519 pub 32B, ["verify"])
       4. AES-GCM decrypt   IV = 12 byte đầu, ct = giữa
       5. Ed25519 verify    chữ ký = 64 byte cuối, verify trên (IV || ct)
       6. DecompressionStream("gzip") → TextDecoder → string ~6.18 MB
       7. sha256(gunzip bytes) === HẰNG SỐ BUILD  (nếu sai: throw "pkg-integrity")
       8. new Function(<45 params>, <source>)     ← bundle game
```

Định dạng `final.pkg`:

```
[ 12 byte IV ][ AES-GCM ciphertext ][ 64 byte Ed25519 signature ]
signature phủ lên (IV || ciphertext)
```

Khoá (lấy tại runtime, xem `live/patch/keys.json`):

```
AES-GCM : 8e1f7618de022e14be5ac75e4a880d9bcceef3ec45be2250e243b8344126b378
Ed25519 : 8809c0874c97402ccd667a85b7b644df8dce5514f15a02acfc8cfea438326f6c
```

Điểm check integrity (trong loader, `loader-body.js` offset ~812870–813014):

```js
Fpw6Vv = !!sLk35j && sLk35j.length === 0x96 && sjHcJKb.length === 0x96;
if (Fpw6Vv) { for (n=0; n<0x96; n++) if (sLk35j[n] !== sjHcJKb[n]) { Fpw6Vv = false; break; } }
if (!Fpw6Vv) { throw new <Error>("pkg-integrity"); }
```

- `sLk35j` = **sha256(gunzip bytes)** mong đợi, nhúng trong loader (build time).
- `sjHcJKb` = sha256 của payload hiện tại.
- Hash mong đợi của build hiện tại: `c010bb6b72cba85e07164c5c29ec89d22dd71dd4534b87d8f241fcf89b10c8b5`
  (= sha256 của text gốc đã gunzip).

Vì là SHA‑256 của chính payload, **không thể** sửa payload mà vẫn khớp hash.

---

## 2. Những gì ĐÃ chạy được (verified)

### 2.1. Patch HTML loader — tắt check integrity

Thay trong **response HTML**:

```
if(!Fpw6Vv){throw      →      if(!1){throw
```

Đã kiểm chứng: lỗi `pkg-integrity` biến mất, loader đi tiếp sang bước verify chữ ký.

### 2.2. Repack `final.pkg` đúng định dạng

`live/patch/pkg-tool.js` (unpack/pack, AES‑GCM + gzip, sig 64 byte bất kỳ):

```powershell
node live/patch/pkg-tool.js info   live/patch/cache/final.pkg
node live/patch/pkg-tool.js unpack live/patch/cache/final.pkg live/patch/base.js
node live/patch/pkg-tool.js pack   live/patch/base.js          live/patch/out.pkg
node live/patch/pkg-tool.js roundtrip live/patch/cache/final.pkg
```

Đã kiểm chứng: pkg repack (cùng plaintext, IV khác, sig = 0) được loader
**giải mã + gunzip bình thường**; chỉ chết ở bước verify/hash.

### 2.3. Sửa source **in‑place, cùng độ dài** thì loader chấp nhận

- Đổi 1 ký tự ở giữa JS (cùng độ dài) → game load bình thường.
- Đổi ký tự cuối text → load bình thường.
- Chèn/xoá **dịch chuyển offset** (dù tổng độ dài không đổi) → loader từ chối
  (source bị slice theo offset, dịch chuyển làm lệch lát cắt).
- Append ở **cuối text** thì có thực thi (`window.__APPEND_OK=1`) nhưng nằm
  **ngoài scope** của bundle (`game2` undefined) ⇒ không dùng để hook gameplay.

Kết luận: muốn sửa code trong bundle qua pkg, phải **overwrite một vùng cùng độ dài
tại đúng chỗ code thực thi**, không được insert/delete.

### 2.4. Chặn verify bằng injection **trước khi document chạy**

`Page.addScriptToEvaluateOnNewDocument` (DevTools/CDP) override
`SubtleCrypto.prototype.verify` (dạng accessor) + patch HTML integrity
→ pkg đã sửa (khác độ dài, khác nội dung) **load được** (9 canvas).

---

## 3. Những gì KHÔNG hoạt động (và vì sao)

| Cách | Kết quả | Nguyên nhân |
|---|---|---|
| Repack pkg rồi serve, **không** patch HTML | “Couldn't load the game” | Verify Ed25519 thất bại (không có private key) |
| Patch `if(!Fpw6Vv)` rồi serve pkg sửa nội dung | vẫn fail | Verify vẫn chạy; HTML không chặn được |
| Stub `SubtleCrypto.prototype.verify` **chèn trong HTML** (script đầu tiên) | loader abort sớm (không gọi verify) | Loader coi đây là can thiệp; chỉ stub đặt qua pre‑document (CDP) mới tác dụng |
| Proxy `window.Function` **chèn trong HTML** | loader abort, `calls=0` | Cùng lý do: loader compile ở ngữ cảnh/ realm mà script HTML không chạm tới |
| Chèn code vào giữa source (marker nhỏ) | fail | Dịch chuyển offset → lát cắt source sai |
| Append code cuối text | chạy nhưng ngoài scope | Code ở ngoài IIFE, `game2` không tồn tại |

Ghi chú: `crypto.subtle.verify` **có** bị gọi (stack cho thấy wrapper `V5s3Lt` →
`yKYAGoM`, eval `<anonymous>:3:895125 / 769567`). Nhưng việc stub nó từ HTML không
ăn thua; stub qua CDP (áp cho **mọi realm**) thì ăn.

---

## 4. Cách làm khuyến nghị

### A. Sửa source + log console (đã kiểm chứng, dùng ngay)

Đúng pipeline repo đang có (`live/run-patched.js`, `live/hooktest.js`):

1. Hook `window.Function` **trước khi document chạy** (CDP `addScriptToEvaluateOnNewDocument`).
2. Khi loader gọi `new Function(45 args, source)`:
   - thay `source` bằng bản đã sửa (anti‑hook + code của bạn),
   - hoặc chèn code tại `game2.update=function`.
3. Anti‑hook trong bundle (`dav/cXu`) chỉ kích hoạt khi `Function` bị proxy, nên phải
   thay 3 pattern trong **source** trước khi compile:

```
var dax=window[        →  cXu=!1;dav=!1;var dax=window[
if(cXu)var daC         →  if(!1)var daC
(dru||dav)&&alert(     →  (!1)&&alert(
```

Đây là cách duy nhất hiện tại cho phép **chèn code tuỳ ý** vào scope `game2` và in log.

### B. Proxy response (không cần DevTools) — giới hạn

Có thể làm hoàn toàn ở tầng response nếu chấp nhận **chỉ sửa in‑place cùng độ dài**
trong pkg, và **tắt check chữ ký** bằng cách reverse thêm loader (chưa xong).

Những gì proxy phải làm:

1. `GET https://deadshot.io/`
   - trả HTML gốc đã patch: `if(!Fpw6Vv){throw` → `if(!1){throw`
   - bỏ `content-encoding: br`, set `content-length`, `cache-control: no-store`.
2. `GET https://deadshot.io/final.pkg?*` (và `final_legacy.pkg`)
   - trả pkg tự đóng gói (mục 2.2), `content-type: application/octet-stream`,
     bỏ `content-encoding`/`etag`, `cache-control: no-store`.
3. Chữ ký: **bắt buộc** phải vô hiệu hoá verify trong loader (hoặc dùng DevTools
   pre‑script). Nếu không, mọi pkg sửa đều bị từ chối.

Addon mitmproxy mẫu: `live/patch/mitm-deadshot.py`.

Lưu ý proxy:
- Cloudflare: HTML `cf-cache-status: HIT`, pkg `max-age=3600, no-store`; luôn
  `Network.setCacheDisabled` khi test hoặc dùng query mới.
- Query build `?dr0t1GFI8r1793127903816` đổi theo deploy → match wildcard.
- Trang không có CSP; SRI chỉ có ở script Cloudflare Insights (không liên quan).

---

## 5. File trong thư mục này

| File | Việc |
|---|---|
| `pkg-tool.js` | unpack/pack/roundtrip `final.pkg` (AES‑GCM + gzip, layout chuẩn) |
| `keys.json` | AES + Ed25519 key lấy từ build hiện tại |
| `build.js` | build `out/index.html` (integrity off + verify stub) + `out/final.pkg` |
| `build-hook.js` | HTML chèn Function interceptor (chỉ để tham khảo — **không** ăn với build này) |
| `make-*.js` | tạo các biến thể pkg để test (same‑length, interior, append, in‑place…) |
| `verify-cdp.js`, `combo-test2.js` | test end‑to‑end bằng CDP `Fetch.fulfillRequest` (mô phỏng proxy) |
| `debug-*.js` | bắt `pkg-integrity`, đọc locals, lấy sha256 mong đợi |
| `loader-trace.js` | trace loader thật: fetch pkg, WebCrypto, DecompressionStream, Function |
| `mitm-deadshot.py` | addon mitmproxy serve `out/index.html` + `out/final.pkg` |

---

## 6. Bảng offset/pattern hữu ích (build 2026‑11‑19)

| Thứ | Giá trị |
|---|---|
| Loader inline | script #3, ~966,774 ký tự |
| `if(!Fpw6Vv){throw` | 1 lần trong HTML |
| Throw `pkg-integrity` | eval 3:813001, `loader-body.js` ~813014 |
| sha256 mong đợi | `c010bb6b…c8b5` (sha256 của text gốc gunzip) |
| Verify call stack | `V5s3Lt` → `yKYAGoM` (eval 3:895125, 3:769567) |
| `Function` call | 45 args, source ~5.2 MB, params: `Object, DataView, requestAnimationFrame, …, WebSocket, typed arrays, fetch, Image, pkgCanvas2dPrototype, XMLHttpRequest, pkgAudio…` |
