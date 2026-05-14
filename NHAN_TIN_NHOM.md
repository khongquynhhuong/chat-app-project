Nhắn tin nhóm (Group Chat)
Quy mô: Tối đa 100 thành viên/nhóm.
Quản lý: Thêm/Xóa thành viên, thay đổi tên nhóm, rời nhóm.
Thông báo: Hiển thị ai trong nhóm đã đọc tin nhắn.
Flow:
Figure 12-14 explains what happens when User A sends a message in a group chat. Assume
there are 3 members in the group (User A, User B and user C). First, the message from User
A is copied to each group member’s message sync queue: one for User B and the second for
User C. You can think of the message sync queue as an inbox for a recipient. This design
choice is good for small group chat because:
• it simplifies message sync flow as each client only needs to check its own inbox to get
new messages.
• when the group number is small, storing a copy in each recipient’s inbox is not too
expensive.
WeChat uses a similar approach, and it limits a group to 500 members [8]. However, for
groups with a lot of users, storing a message copy for each member is not acceptable.
On the recipient side, a recipient can receive messages from multiple users. Each recipient
has an inbox (message sync queue) which contains messages from different senders. Figure
12-15 illustrates the design.
