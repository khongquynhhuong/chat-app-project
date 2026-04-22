(Các yêu cầu phi chức năng được dự tính theo hướng dẫn trong cuốn sách System Design Interview - An insider’s guide) 
1. Tổng quan hệ thống (System Overview)
Xây dựng một nền tảng nhắn tin đa phương thức, hỗ trợ thời gian thực (real-time) với độ trễ cực thấp, khả năng mở rộng cao và hoạt động ổn định trên nhiều thiết bị.
Đối tượng: Người dùng cá nhân và nhóm nhỏ.
Quy mô thiết kế: 50 triệu người dùng hoạt động hàng ngày (50M DAU). 
Lưu lượng dự kiến: ~23,000 Messages Per Second (Average).
2. Yêu cầu chức năng (Functional Requirements)
2.1 Quản lý người dùng & Kết nối
Đăng ký/Đăng nhập: Hỗ trợ xác thực qua JWT.
Hỗ trợ đa thiết bị: Một tài khoản có thể đăng nhập đồng thời trên Mobile, Web, Desktop. Đồng bộ hóa trạng thái tin nhắn giữa các thiết bị.
Trạng thái Online (Online Presence): * Hiển thị trạng thái "Đang hoạt động" (Green dot).
Hiển thị thời gian truy cập cuối cùng (Last seen).
Cập nhật trạng thái thông qua cơ chế Heartbeat (Ping/Pong).
2.2 Nhắn tin cá nhân (One-on-One Chat)
Thời gian thực: Tin nhắn phải được chuyển đến người nhận với độ trễ < 200ms.
Trạng thái tin nhắn: 
- Sent: Tin nhắn đã lên đến Server.
- Delivered: Tin nhắn đã tải xuống thiết bị người nhận.
- Read: Người nhận đã mở cuộc hội thoại.
Lịch sử tin nhắn: Hỗ trợ tải vô hạn (Infinite scroll) lịch sử trò chuyện.
2.3 Nhắn tin nhóm (Group Chat)
Quy mô: Tối đa 100 thành viên/nhóm.
Quản lý: Thêm/Xóa thành viên, thay đổi tên nhóm, rời nhóm.
Thông báo: Hiển thị ai trong nhóm đã đọc tin nhắn.
2.4 Thông báo (Push Notifications)
Gửi thông báo đẩy khi người dùng không mở ứng dụng (App background/Closed).
Hỗ trợ xem trước nội dung tin nhắn và tên người gửi trên màn hình khóa.
3. Yêu cầu phi chức năng (Non-Functional Requirements)
3.1 Hiệu năng & Độ trễ (Performance)
Low Latency: Ưu tiên hàng đầu cho việc truyền tải tin nhắn.
High Throughput: Hệ thống phải xử lý được ít nhất 100,000 tin nhắn/giây vào giờ cao điểm.
3.2 Khả năng mở rộng (Scalability)
Horizontal Scaling: Mọi thành phần (Chat Service, Presence Service) phải có khả năng mở rộng theo chiều ngang khi số lượng người dùng tăng.
Stateless Services: Các API server phải stateless để dễ dàng cân bằng tải (Load Balancing).
3.3 Độ tin cậy (Reliability & Availability)
Zero Message Loss: Đảm bảo không mất tin nhắn ngay cả khi Server gặp sự cố (Sử dụng Message Queue).
High Availability: Hệ thống hoạt động 24/7, tỷ lệ uptime 99.99%.
3.4 Bảo mật (Security)
End-to-End Encryption (Optional/Future): Mã hóa tin nhắn để chỉ người gửi và người nhận đọc được.
Authentication: Bảo mật kênh WebSocket bằng JWT Token đã triển khai.
4. Phân tích luồng dữ liệu (Data Flow)
Gửi tin: Client A gửi tin qua WebSocket -> Chat Service nhận -> Lưu vào Message Store (NoSQL) -> Đẩy vào Message Queue.
Nhận tin: Chat Service đọc từ Message Queue -> Kiểm tra người nhận online trên Server nào (qua Redis) -> Đẩy tin nhắn qua WebSocket đến Client B.
Offline: Nếu Client B offline -> Đẩy vào Push Notification Service (FCM/APNs).






Thiết kế database: 
1. Relational Database (PostgreSQL)
Dùng để lưu các dữ liệu có tính quan hệ chặt chẽ, tần suất thay đổi thấp nhưng yêu cầu tính nhất quán (ACID) cao.
Table: users
Lưu thông tin định danh người dùng.
id: BIGINT (Primary Key)
username: VARCHAR(50) (Unique)
password: VARCHAR(255)
created_at: TIMESTAMP
Table: friends
Lưu mối quan hệ bạn bè.
user_id_1: BIGINT
user_id_2: BIGINT
status: INT (0: Pending, 1: Accepted)
created_at: TIMESTAMP
Index: (user_id_1, user_id_2)
Table: groups
Lưu thông tin nhóm chat.
id: BIGINT (PK)
name: VARCHAR(100)
creator_id: BIGINT
created_at: TIMESTAMP
Table: group_members
group_id: BIGINT
user_id: BIGINT
role: VARCHAR(20) (MEMBER, ADMIN)
Index: group_id

2. NoSQL Key-Value Store (Redis)
Dùng để lưu các dữ liệu thay đổi liên tục, yêu cầu tốc độ đọc/ghi tính bằng mili giây.
Online Presence: * Key: presence:{user_id}
Value: last_active_timestamp
TTL: 30-60 seconds (Dùng cơ chế Heartbeat để gia hạn).
User Mapping (Multi-device): * Key: user:sessions:{user_id}
Value: Set of [server_id:connection_id] (Để biết gửi tin nhắn đến những server nào mà user đang kết nối).
Caching: Lưu metadata của 20 cuộc hội thoại gần nhất để load app cực nhanh.

3. NoSQL Wide-Column Store (Cassandra / ScyllaDB)
Đây là "trái tim" lưu trữ tin nhắn. SQL sẽ bị "treo" khi bảng tin nhắn đạt tới hàng tỷ dòng, nhưng NoSQL dạng Wide-Column thì không.
Table: messages
Partition Key: conversation_id (Để tất cả tin nhắn của 1 cuộc chat nằm trên cùng một node vật lý, giúp load lịch sử cực nhanh).
Clustering Key: message_id (Dùng Time-based UUID để tin nhắn tự động sắp xếp theo thời gian).
Column
Type
Description
conversation_id
UUID
ID của phòng chat (1-1 hoặc Group)
message_id
TIMEUUID
ID duy nhất, chứa dấu mốc thời gian
sender_id
BIGINT
Người gửi
content
TEXT
Nội dung tin nhắn
type
INT
0: Text, 1: Image, 2: Video...
created_at
TIMESTAMP
Thời gian tạo



