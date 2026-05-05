# Huong dan trien khai tinh nang hien lich su chat 1-1

Tai lieu nay huong dan cach trien khai tinh nang hien lich su chat 1-1 dua tren code hien co cua du an (Spring Boot + React + STOMP).

## 1) Hien trang

- Backend da co endpoint lay lich su:
  - `GET /api/dm/messages?peerUsername={username}&limit={n}&beforeMessageId={uuid}`
  - Controller: `src/main/java/com/example/chat_app_project/controller/DirectMessageController.java`
  - Service: `src/main/java/com/example/chat_app_project/service/DirectMessageServiceImpl.java`
- Frontend chua goi endpoint nay:
  - `frontend/src/services/chatRepository.js` dang de `TODO` cho `fetchMessageHistory`.
- `ChatContext` hien dang quan ly state theo peer, gui/nhan realtime qua STOMP, nhung chua nap lich su khi mo cuoc tro chuyen.

## 2) Muc tieu can dat

Khi user mo mot cuoc chat voi `peerUsername`:

1. Frontend goi REST de lay 20 tin nhan gan nhat.
2. Hien danh sach tin nhan theo thu tu tang dan (cu -> moi).
3. Co the bam "Tai them" de phan trang len lich su cu hon.
4. Tin nhan realtime moi den tiep tuc append vao cuoi danh sach.
5. Trang thai loading/error duoc xu ly ro rang.

## 3) Backend (da san sang, chi can xac nhan)

### Endpoint lay lich su

Su dung endpoint:

- `GET /api/dm/messages`
- Query params:
  - `peerUsername` (bat buoc)
  - `limit` (mac dinh `20`, toi da `100`)
  - `beforeMessageId` (tuy chon, de phan trang)

Luu y logic hien tai trong `DirectMessageServiceImpl`:

- Neu khong co `beforeMessageId`: lay nhom tin moi nhat.
- Neu co `beforeMessageId`: lay tin nhan cu hon moc do.
- Sau do sap xep theo `messageId` tang dan de frontend render dung thu tu hoi thoai.

## 4) Frontend - trien khai repository

Cap nhat `frontend/src/services/chatRepository.js`:

- Implement `fetchMessageHistory(token, peerUsername, page)` bang `fetch`.
- Goi URL:
  - Lan dau: `/api/dm/messages?peerUsername=alice&limit=20`
  - Lan sau: `/api/dm/messages?peerUsername=alice&limit=20&beforeMessageId=<oldest_message_id>`
- Gan header `Authorization: Bearer <token>`.
- Map response ve format message ma UI dang dung:
  - `id`: `messageId`
  - `peerUsername`: gia tri peer hien tai
  - `content`: `content`
  - `sentAt`: `createdAt`
  - `direction`: `'out'` neu `senderUsername === authUser.username`, nguoc lai `'in'`
  - `status`: co the map tu `deliveryStatus` (`SENT`, `READ`...)

## 5) Frontend - bo sung state trong ChatContext

Cap nhat `frontend/src/context/ChatContext.jsx`:

### 5.1 Them state metadata theo peer

Them 2 bucket:

- `history`: thong tin phan trang theo peer:
  - `loading`
  - `hasMore`
  - `oldestMessageId`
  - `loaded` (da load lan dau hay chua)
  - `error`
- `messages`: giu nguyen bucket tin nhan hien co.

### 5.2 Them action reducer

De xuat cac action:

- `HISTORY_LOAD_START`
- `HISTORY_LOAD_SUCCESS`
- `HISTORY_LOAD_ERROR`
- `HISTORY_LOAD_MORE_START`
- `HISTORY_LOAD_MORE_SUCCESS`

Nguyen tac:

- Lan dau: replace message list cua peer bang du lieu lich su.
- Lan "tai them": prepend tin nhan cu vao dau danh sach, khong duplicate theo `id`.
- Sau moi lan load, cap nhat:
  - `oldestMessageId` = `id` dau danh sach.
  - `hasMore` = `fetchedCount === limit`.

### 5.3 Them ham nap lich su

Trong `ChatProvider`, them:

- `loadHistory(peerUsername, { more = false } = {})`
- Su dung `fetchMessageHistory(authUser.token, peerUsername, { limit, before })`.
- Neu `more = false`: load lan dau.
- Neu `more = true`: su dung `before = oldestMessageId`.

### 5.4 Tich hop vao luong mo chat

Trong `openChatWithPeer(peerUsername)`:

1. `ENSURE_PEER`
2. `SELECT_PEER`
3. Neu peer chua `loaded` thi goi `loadHistory(peerUsername)`

Neu muon chac chan luon refresh khi mo lai cuoc tro chuyen, co the bo qua check `loaded` va nap lai moi lan.

## 6) Frontend - cap nhat UI

Vi du khu vuc hien thi tin nhan:

- Hien spinner khi `history.loading === true` va chua co message.
- Hien nut `Tai them` o dau danh sach khi `history.hasMore === true`.
- Khi bam `Tai them` -> goi `loadHistory(peerUsername, { more: true })`.
- Hien loi nhe neu `history.error` co gia tri.

## 7) Mapping payload de tranh lech du lieu

Can thong nhat cac field:

- REST history tra ve `messageId`, `createdAt`, `senderUsername`.
- STOMP incoming/ack dang duoc normalize trong `frontend/src/domain/chat.js`.

De tranh duplicate, nen giu quy uoc:

- Moi message trong state co `id` la server message id (UUID string) neu da co ACK.
- Tin optimistic tam thoi dung `clientMessageId`.
- Khi ACK ve, reducer `SENT_ACK` thay `id` tu client id -> server id.



## 8) Kich ban test de xac nhan

### API test

- Goi `GET /api/dm/messages?peerUsername=<valid>&limit=20`:
  - Ky vong 200, danh sach toi da 20 phan tu.
- Goi tiep voi `beforeMessageId` = `id` dau danh sach:
  - Ky vong nhan duoc nhom cu hon.

### UI test

1. Mo chat voi user A:
   - Thay lich su 20 tin gan nhat.
2. Bam "Tai them":
   - Tin cu hon duoc chen len tren, khong duplicate.
3. Gui tin moi:
   - Bong bong optimistic hien ngay, sau ACK doi sang trang thai sent.
4. Nhan tin moi tu peer:
   - Tin moi append cuoi danh sach.

## 9) Mau pseudo-flow trong ChatContext

```js
async function openChatWithPeer(peerUsername) {
  dispatch({ type: 'ENSURE_PEER', payload: peerUsername });
  dispatch({ type: 'SELECT_PEER', payload: peerUsername });
  if (!state.history[peerUsername]?.loaded) {
    await loadHistory(peerUsername);
  }
}

async function loadHistory(peerUsername, { more = false } = {}) {
  const meta = state.history[peerUsername];
  const before = more ? meta?.oldestMessageId : undefined;
  const rows = await fetchMessageHistory(token, peerUsername, { limit: 20, before });
  dispatch({
    type: more ? 'HISTORY_LOAD_MORE_SUCCESS' : 'HISTORY_LOAD_SUCCESS',
    payload: { peerUsername, rows, limit: 20 },
  });
}
```

## 10) Uu tien trien khai de de merge

1. Implement `fetchMessageHistory` trong `chatRepository.js`.
2. Them state + actions history trong `ChatContext.jsx`.
3. Noi `openChatWithPeer` voi `loadHistory`.
4. Them nut `Tai them` va loading state o UI message list.
5. Test manual theo muc 8.

---

Neu muon tach thanh cac commit nho, nen chia:

- Commit 1: repository + mapper data
- Commit 2: context/reducer history + pagination
- Commit 3: UI load more + loading/error state
