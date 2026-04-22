-- Chạy thủ công nếu bảng messages đã tồn tại từ trước khi thêm cột delivery_status trong entity.
-- Keyspace: thay đổi cho đúng môi trường (vd. chat_service).

USE chat_service;

ALTER TABLE messages ADD delivery_status int;
