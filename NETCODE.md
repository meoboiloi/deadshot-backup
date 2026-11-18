# DEADSHOT — server → client protocol & enemy rendering

Nguồn: `live/source-readable.js` (base variant) + `live/captured.js` (final variant, per load).
Số offset là **ký tự** trong file (file gần như 1 dòng).

---

## 1. Kênh truyền

- Game socket: `WebSocket`, `binaryType = 'arraybuffer'`.
- Mỗi message = **msgpack** (msgpack-lite) decode ra **một mảng packet**.
- Mỗi packet có `t` = type. Type là **string build-specific** (xem mục 6).
- Client → server: mảng packet, mỗi phần tử `{type: '...', ...}`; trước khi gửi, `type` được đổi tên thành `t` và encode msgpack.

Mã:
- Decode: `game2.sZmtc_k3` (base @ **2.227.127**)
  `var packets = msgpack.decode(new Uint8Array(message.data));`
- Gửi: `game2.update` (base @ **2.228.905**)
  `game2.ws.send(msgpack.encode(game2.lNk7_10e));`

---

## 2. Bảng packet server → client (semantic)

| Semantic | Base key (variant base) | Final key (ví dụ load A) | Fields | Ý nghĩa |
|---|---|---|---|---|
| **you / me** | `J17e17SIb` | `ІıӏıІІIιіI` | `{id, s}` | `s` = spectating; gán `game2.me` cho entity `id` |
| **create** | `Yl8b8_b1` | `llıιIıІ` | `{p:[i,b,x,y,a,n]}` + named x/y | tạo entity mới |
| **update** | `p5KUq_b2` | `ІӏіӏΙΙIı1і` | `{a:[id,x,y,angle]}` | vị trí + góc mới |
| **remove** | `xiy5k_b3` | `ІlΙΙІııιіӏ` | `{i:id}` | xoá entity |
| **envs** | `e` | `e` | `{<env>}` | packet đầu tiên, handler hiện no-op |

Lưu ý: create key = tên property **x**, update key = property **y**, remove key = property **z** của build. Đây là cố ý gây nhiễu.

### create — handler (base @ 2.222.550)

```js
var props = ['i','b','x','y','a','n'];
for (...) packet2[props[i]] = packet2.p[i];
// -> id, type(b), x, y, angle(a), needsUpdate(n)
```

Sau đó tạo entity:
```js
{
  new:      { pos: vec2(x, y), angle: a/100 },
  U440_21x: { pos: vec2(x, y), angle: a/100 },  // server target
  old:      { pos: vec2(x, y), angle: a/100 },
  cP29_21y: { pos: vec2(x, y), angle: a/100 },  // previous ack
  id, type: b, needsUpdate: n,
  kylV_30y: new game2.object(),                 // render object
  zaZq_1ra: 0                                   // ticks since update
}
```
(Trong source, tên `pos` là `jH1yM_cq`, `angle` là `n67b7_cr`.)

### update — handler (base @ 2.225.866)

```js
a = [id, x, y, angle]
id    = a[0]
new.x = a[1]
new.y = a[2]
new.angle = a[3] / 100      // centi-radian? a/100 radian
```

Nếu chưa có entity → client gửi `getObject` cho id đó.

### remove — handler

```js
{ i: id } -> tìm entity id, gọi type.remove(), remove khỏi scene, splice
```

### client → server (meta)

- `{type:'getEnvs'}` — xin environment.
- `{type:'getID'}` — xin id của mình.
- `{type:'getObject', object:{id}}` — xin tạo lại entity bị miss.
- Input khác (bắn, di chuyển…) cũng là packet `type` → `t`, gửi mỗi frame.

---

## 3. Đồng bộ vị trí (interpolation)

Entity giữ 4 trạng thái: `old`, `new`, `U440_21x` (server target), `cP29_21y` (previous), và `kylV_30y` (render).

### Khi nhận update packet

Hằng số:
```js
defaultLerp = 1.5
slowLerp    = 1.5      // thực tế bằng default
normalLerp  = 0.2
fastLerp    = 0.6
highestVel  = 10
```

Tính lerp theo vận tốc:
```js
xNormal = normalLerp
if (abs(U440.x - cP29.x) < 10)
  xNormal = lerp(0.2, 0.6, (10 - abs(U440.x - cP29.x)) / 10);

new.x = lerp(old.x + (packet.x - cP29.x) * xLerp, packet.x, xNormal);
new.y = lerp(old.y + (packet.y - cP29.y) * yLerp, packet.y, yNormal);
new.angle = packet.angle / 100;
// wrap angle ±π
```
Sau đó:
```js
old.x = render.x; old.y = render.y; old.angle = render.angle;
cP29.x = U440.x; ...
zaZq_1ra = 0;
PkJd_2tq.push(id);   // đánh dấu có update trong frame
```
Nếu lệch < 0.3 thì snap `old = new`.

### Khi **không** có update (dead reckoning)

Mỗi message/frame, với entity `zaZq_1ra > 1`:
```js
new.x = lerp(new.x, U440.x, 0.2);
new.y = lerp(new.y, U440.y, 0.2);
```
`zaZq_1ra` tăng mỗi lần xử lý message; nếu `>= 120` (và không pending, ngoài vùng nhìn) → remove.

### Mỗi frame render (`game2.update` @ 2.228.905)

```js
render.angle = project(old.angle, new.angle);
render.x     = lerp(render.x, project(old.x, new.x), 0.8);
render.y     = lerp(render.y, project(old.y, new.y), 0.8);
game2.types[type].tick(obj);   // U18r_20p
```

`project()` (`R411_36z`):
```js
if (elapsed > dt + 5)
  return (new - old) / dt * (dt + 5) + old;
return (new - old) / dt * elapsed + old;
```
- `dt = 5.3`
- `elapsed = game2.b7Zd_19t.K19s7_tl` (tích lũy thời gian frame)
- Kết quả: vị trí render mượt giữa `old` và `new`, rồi lerp 0.8 lần nữa.

---

## 4. Render vị trí ra màn hình

Game dùng **canvas 2D scene graph** (`game2.object`), không phải three.js cho gameplay.

Mỗi object có:
- `jH1yM_cq` (x,y) — world position
- `n67b7_cr` — rotation
- `size`, `opacity`, `zIndex`, `type`, `image`/`s2KC_13d` draw

Camera renderer (`base @ 2.181.170`):
```js
ctx.translate(
  -camera.jH1yM_cq.x / camera.ratio + canvas.width/2,
  -camera.jH1yM_cq.y / camera.ratio + canvas.height/2
);
scene.Pw8ah_ga(ctx, camera.ratio * scene.M0O8_2uu.ratio, 1);
```
Scene (`game2.scene` @ 2.217.859):
```js
ctx.translate(-scene.M0O8_2uu.x / ratio, -scene.M0O8_2uu.y / ratio);
ctx.rotate(-scene.M0O8_2uu.angle);
// draw children
ctx.rotate(scene.M0O8_2uu.angle);
ctx.translate(scene.M0O8_2uu.x / ratio, scene.M0O8_2uu.y / ratio);
```
Object (`Pw8ah_ga`):
```js
x = (obj.jH1yM_cq.x + obj.offsetX) / ratio + tx;
y = (obj.jH1yM_cq.y + obj.offsetY) / ratio + ty;
ctx.translate(x, y);
ctx.rotate(obj.n67b7_cr);
// draw sprite
```

Suy ra công thức screen:
```text
screenX = (enemyWorldX - cameraWorldX) / zoom + canvas.width/2  + sceneOffsetX
screenY = (enemyWorldY - cameraWorldY) / zoom + canvas.height/2 + sceneOffsetY
```
- `zoom = camera.ratio` (pixel/world unit); scene có zoom/rotation riêng (`M0O8_2uu`).
- `enemyWorld` = `entity.kylV_30y.jH1yM_cq` (vị trí đã nội suy), **không phải** `packet.a[1/2]` thô.
- Góc quay sprite = `entity.kylV_30y.n67b7_cr` (radian).

Nên enemy được render:
1. server gửi update `a:[id,x,y,angle]`
2. cập nhật `new`, `U440`, `old`, `cP29`
3. `game2.update` nội suy `render.x/y/angle` (lerp 0.8 + project)
4. type tick cập nhật sprite/rig
5. scene graph vẽ tại world pos, camera translate/zoom → screen.

---

## 5. Type/entity

- `game2.types[type] = {create, tick, updatePacket, remove}`.
- `spectator` được đăng ký literal; **type của player/entity khác là build-specific** (giống packet keys), server gửi trong `packet2.b`.
- Tick mặc định no-op; player type do game code đăng ký, cập nhật sprite/rig dựa trên `kylV_30y` + `n67b7_cr` + trạng thái.

---

## 6. Build-specific keys (quan trọng)

Table packet và **tên key đổi mỗi lần load** (transform random):

- Base variant:
  - table `R3485_x6`; keys `J17e17SIb` (you), `Yl8b8_b1` (create), `p5KUq_b2` (update), `xiy5k_b3` (remove), `e`.
- Final load A:
  - table `l1IΙIιӏІlΙ`; keys `ІıӏıІІIιіI`, `llıιIıІ`, `ІӏіӏΙΙIı1і`, `ІlΙΙІııιіӏ`, `e`.
- Final load B:
  - table `ііiΙIlӏιΙ`; keys `ΙiІӏlıІi`, `ιіlӏӏiiI`, `Ιӏιli1ii`, `e`…

→ Không hardcode key. Server dùng keymap của **session/build** (client gửi seed/build token trong connect, hoặc server phát cùng seed qua attest). Muốn capture đúng, đọc key từ `game2` của **cùng session** hoặc log packet thực tế.

**Hệ quả cho mod:**
- `run-patched.js` thay **toàn bộ body** bằng source base sẽ dùng **key base** — có thể **không khớp** packet key server gửi cho session final. Chỉ an toàn cho menu/test.
- Cách đúng: hook `Function`, **sửa body final tại chỗ** (string replace) để giữ nguyên table/key/type của session; đừng thay bằng variant khác.
- Anti-hook `dav/cXu` cũng nên patch **trên body final tại chỗ** (3 pattern giống hệt trong base/final).

---

## 7. Cách xác minh / capture live

1. Hook `msgpack.decode` / `game2.sZmtc_k3` để log `packets` (kèm key thực tế).
2. Hoặc `node cli.js ws-frames --hex --out ...` rồi decode msgpack (Python `uv run --with msgpack`).
3. Đọc `game2.types` / `game2.w44i_2qp` trong runtime để xem type keys và entity thật.
4. Packet đầu tiên thường là `e` (envs), sau đó `you`, `create`, `update`, `remove`.

---

## 8. Khung xương / animation — server gửi hay client tự render?

**Kết luận: client tự render. Server KHÔNG gửi bone/skeleton/pose.**

### Bằng chứng từ packet

Toàn bộ packet server → client chỉ có:
- create: `p:[id, type, x, y, angle, needsUpdate]`
- update: `a:[id, x, y, angle]`
- remove: `{i:id}`
- you: `{id, s}`
- envs: `{e:...}`

Không có mảng bone, matrix, quaternion, clip id, frame, pose, animation state. Handler update chỉ đọc `a[0..3]`; create chỉ đọc `p[0..5]`.

### Bằng chứng từ code client

Client có sẵn rig + animation local:

- `bodyRig` / `rigV2` trong weapon config:
  - `bodyRig: 'rigged_untextured'`, `'tuxedo'`, `'lady'`, `'femalerigged'`, `'shotgunplayer'`…
  - `rigV2: true`
- Hàm load rig (`base ~4.611.935`):
  ```js
  var dya = di0(cOz[cOE[dy7]].ui.bodyRig, cOz[cOE[dy7]].ui.rigV2);
  dy9.load(dya, function (gltf) { di4(gltf, dy7); }, ...);
  ```
  → tải GLTF rig từ CDN/asset local, không lấy từ packet.
- Hàm dựng model + mixer (`base ~4.583.482`, `captured ~4.630.235`):
  ```js
  var dye = new rwJ2_319.AnimationMixer(dyd.scene);
  dyc.Run          = dh8(dye, rig, 'Run');
  dyc.RunSideways2 = dh8(dye, rig, 'RunSideways2');
  dyc.RunSidewaysLeft = dh8(dye, rig, 'RunSidewaysLeft');
  dyc.Home         = dh8(dye, rig, 'HomeAnim');
  dyc.Jump         = dh8(dye, rig, 'Jump');
  dyc.Death        = dh8(dye, rig, 'Death');
  dyc.AimFP        = dh8(dye, rig, 'AimAnimFP');
  dyc.ReloadFP     = dh8(dye, rig, 'ReloadFP');
  dyc.CrouchIdle   = dh8(dye, rig, 'CrouchIdle');
  dyc.CrouchWalk   = dh8(dye, rig, 'CrouchWalk');
  ```
  → clip lấy từ **file GLTF local**, không từ server.
- `dgK` / `dgJ` chọn action theo trạng thái local (weapon, aim, reload, crouch, movement, chết…).
- `AnimationMixer.update(dt)` chạy mỗi frame bằng `dt` local.

### Server chỉ gửi "gợi ý trạng thái"

- `type` (`b` trong create): chọn rig/skin/weapon model local.
- `needsUpdate` (`n`): cờ refresh/visibility/removal, không phải pose.
- `x, y, angle`: vị trí + hướng của **root** model.
- `id`: map entity.

### Luồng render enemy

1. Server gửi vị trí/góc + type.
2. Client nội suy `render.x/y/angle` như mục 3.
3. Client gán vị trí/góc cho **root** của model GLTF.
4. Client chọn clip local (Run/RunSideways/Idle/Aim/Reload/Crouch/Jump/Death).
5. `AnimationMixer` tự biến đổi **bone local** theo clip + thời gian.
6. Renderer vẽ model tại vị trí/góc root.

Vì vậy khung xương, pose, animation đều **client-side**; server chỉ quyết định vị trí/góc/type. Hitbox/damage vẫn server-authoritative — sửa animation không đổi hit registration.

### Hệ quả cho mod

- Có thể thay model/clip/animation tốc độ local (visual only).
- Không thể "đọc xương enemy từ server" vì server không gửi.
- Muốn enemy hiện đúng skin/rig, phải map `type` (`b`) → rig local đúng bảng của build; key/type **random mỗi load** như packet key.
- Nếu thay body bằng variant base, `type` mapping có thể lệch → sai model hoặc lỗi.

---

## 9. Tóm tắt một dòng

Server gửi **msgpack array** các packet `{t: buildKey, ...}`; create `p:[id,type,x,y,angle,needsUpdate]`, update `a:[id,x,y,angle/100]`, remove `{i:id}`. Client lưu `old/new/U440/cP29`, nội suy `new`/`render` bằng lerp/project, tick type, rồi vẽ model tại world `(x,y)` qua camera `(world - camera)/zoom + viewport/2`. **Khung xương/animation do client tự load GLTF + AnimationMixer local**; server không gửi bone/pose. Packet key/type **random mỗi load**, nên mod phải patch body final tại chỗ.
