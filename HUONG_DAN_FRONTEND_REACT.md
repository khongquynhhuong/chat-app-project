# Hướng dẫn frontend React (chat DM + WebSocket)

Tài liệu mô tả cách chạy và cách ứng dụng React trong thư mục `frontend/` tích hợp với backend Spring Boot (JWT, STOMP qua SockJS).

## Kiến trúc tổng quan

1. **Đăng ký / đăng nhập** qua REST (`/api/auth/register`, `/api/auth/login`) — giống trước đây với `index.html` tĩnh.
2. **JWT** lưu trong `sessionStorage`; mỗi request từ trình duyệt tới API đi qua **Vite dev proxy** tới cổng Spring (mặc định `8080`).
3. **WebSocket**: sau khi có token, React tạo một **STOMP client** (`@stomp/stompjs` + `sockjs-client`) trỏ tới `/ws?token=...` và header `Authorization: Bearer ...` trên lệnh CONNECT.
4. **Subscribe** (người nhận tự động):
   - `/user/queue/dm` — tin DM từ đối phương.
   - `/user/queue/dm.sent` — xác nhận **SENT** sau khi server lưu tin (ACK cho người gửi).
   - `/user/queue/errors` — lỗi xử lý STOMP (ví dụ validation).
5. **Gửi tin**: `publish` tới `/app/dm/send` với body JSON `SendDirectMessageRequest` và header `content-type: application/json;charset=UTF-8`.

Luồng này khớp với `DirectMessageWsController` (`@MessageMapping("/dm/send")`) và `WebSocketBrokerConfig` (prefix `/app`).

## Cấu trúc thư mục

```
frontend/
  package.json
  vite.config.js      # proxy /api và /ws → http://localhost:8080
  index.html
  src/
    main.jsx
    App.jsx           # UI: đăng nhập, Sent to, Message, nút Sent, nhật ký
    App.css
    useStompChat.js   # hook: một client STOMP / phiên, subscribe + ref để publish
```

## Chuẩn bị

- **JDK + Maven**: backend Spring Boot chạy trước (PostgreSQL, Cassandra, … theo `application.properties` của bạn).
- **Node.js** (khuyến nghị 18+): để chạy Vite.

## Cài đặt dependency

```bash
cd frontend
npm install
```

## Chạy development

1. Khởi động backend (ví dụ `./mvnw spring-boot:run` hoặc chạy từ IDE) trên **`http://localhost:8080`**.
2. Terminal khác:

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại **`http://localhost:5173`**. Mọi gọi `fetch('/api/...')` và SockJS tới `/ws` được Vite **proxy** sang `8080`, tránh CORS khi dev.

## Cách kiểm thử nhanh (hai user)

1. Tab A: **Đăng ký** user `alice`, **Đăng nhập** — để ý `userId` trong nhật ký hoặc response (hoặc tra DB).
2. Tab B: **Đăng ký** `bob`, **Đăng nhập** — lấy `userId` của Bob.
3. Tab A: ô **Sent to** nhập `userId` của Bob, nhập **Message**, bấm **Sent**.
4. Tab A: trong nhật ký xem dòng **SENT — server đã lưu tin** (ACK từ `/user/queue/dm.sent`).
5. Tab B: xem dòng **Tin nhận được** (tin từ `/user/queue/dm`).

## Build production (tùy chọn)

```bash
cd frontend
npm run build
```

Thư mục `frontend/dist` chứa file tĩnh. Bạn có thể:

- Phục vụ bằng Nginx / CDN, và cấu hình CORS + cho phép WebSocket tới backend, **hoặc**
- Copy `dist` vào `src/main/resources/static/` và bật proxy ngược một cổng — khi đó cần cấu hình lại URL SockJS (cùng origin với API) và quyền truy cập `/ws` trên Spring.

Phần tích hợp static vào Spring không bắt buộc trong hướng dẫn này; dev chuẩn là **Vite 5173 + API 8080** như trên.

## Ghi chú kỹ thuật

- **Một STOMP client cho cả nhận và gửi**: `useStompChat` giữ `Client` trong `useRef` và subscribe khi `onConnect`; nút **Sent** gọi `client.publish(...)` trên cùng client đó (không mở kết nối mới mỗi tin).
- **Strict Mode (React 18)**: trong dev, effect có thể chạy hai lần; cleanup `deactivate()` vẫn đảm bảo không rò rỉ kết nối.
- **Proxy WebSocket**: `vite.config.js` cần `ws: true` cho đường `/ws`.
- Nếu đổi cổng backend, sửa `target` trong `vite.config.js`.

## Thay thế `index.html` tĩnh

File `src/main/resources/static/index.html` đã được gỡ để tránh trùng với React; toàn bộ UI test nằm trong `frontend/`.
