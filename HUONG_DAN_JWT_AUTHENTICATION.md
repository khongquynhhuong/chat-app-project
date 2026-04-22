# Hướng dẫn xây dựng Authentication với JWT (Spring Boot 3 + Spring Security)

Tài liệu này mô tả **từng bước** cách triển khai xác thực JWT trong dự án `chat-app-project` (Java 21, Spring Boot 3.5.x), tương ứng với mã nguồn trong repo.

---

## 0. Kiến thức nền và luồng hoạt động

### JWT là gì (ngắn gọn)

- **JWT (JSON Web Token)** là chuỗi có chữ ký; server ký token bằng **secret** (thuật toán **HS256** trong hướng dẫn này).
- Client gửi token trong header **`Authorization: Bearer <token>`** cho mỗi request cần bảo vệ.
- Server **không lưu session** trong bộ nhớ: mỗi request chỉ cần **giải mã và xác minh chữ ký + hạn dùng** → phù hợp API stateless.

### Luồng trong ứng dụng này

1. **Đăng ký** (`POST /api/auth/register`): lưu user + mật khẩu đã **mã hóa BCrypt** (đã có sẵn trong project).
2. **Đăng nhập** (`POST /api/auth/login`): `AuthenticationManager` kiểm tra username/password; nếu đúng → **sinh JWT** và trả về client.
3. **Request có bảo vệ**: `JwtAuthenticationFilter` đọc Bearer token → load `UserDetails` → gán vào `SecurityContext` nếu token hợp lệ.
4. **Chưa đăng nhập / token sai**: `JwtAuthenticationEntryPoint` trả **401** dạng JSON.

### Điều kiện có sẵn trong project

- Entity `User`, `Role`, quan hệ many-to-many, `UserRepository`, `RoleRepository`, đăng ký qua `UserRegisterService`.
- Spring Security đã bật; ta **thay HTTP Basic** bằng **JWT + session STATELESS**.

---

## Bước 1: Thêm dependency JJWT vào Maven

Trong `pom.xml`, trong khối `<dependencies>`, thêm ba dependency **jjwt** 0.12.x (tách `api` / `impl` / `jackson` theo khuyến nghị của thư viện):

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

Các dependency đã có và cần thiết: `spring-boot-starter-security`, `spring-boot-starter-web`, `spring-boot-starter-validation`, JPA (để load user từ DB).

**Kiểm tra:** chạy `./mvnw compile` (hoặc `mvn compile`) để Maven tải thư viện.

---

## Bước 2: Cấu hình secret và thời hạn token

Trong `src/main/resources/application.properties` (hoặc `application.yml`), thêm:

```properties
# JWT: secret UTF-8 phải dài tối thiểu 32 ký tự (256 bit) cho HS256; đổi trên production
jwt.secret=your-secret-at-least-32-characters-long!!
jwt.expiration-ms=86400000
```

**Lưu ý quan trọng**

- Với `Keys.hmacShaKeyFor(...)` (HS256), độ dài secret dạng byte phải **≥ 256 bit** → chuỗi UTF-8 nên **≥ 32 ký tự** (an toàn hơn: dùng chuỗi ngẫu nhiên).
- **Production:** không hard-code secret trong repo; dùng biến môi trường, vault, hoặc `SPRING_APPLICATION_JSON`.

---

## Bước 3: Mở rộng `UserRepository`

Để đăng nhập và filter JWT có thể tìm user theo username, thêm method:

```java
Optional<User> findByUsername(String username);
```

File: `repository/UserRepository.java`.

Spring Data JPA tự tạo truy vấn từ tên method; không cần viết `@Query` nếu tên field entity là `username`.

---

## Bước 4: DTO cho login và response token

### 4.1. Request đăng nhập

Tạo `dto/request/LoginRequest.java`:

- Trường `username`, `password`.
- Annotation Jakarta Validation: `@NotBlank` (giống phong cách `UserRegisterRequest`).

### 4.2. Response sau đăng nhập

Tạo `dto/response/AuthResponse.java`:

- `accessToken`: chuỗi JWT.
- `tokenType`: cố định `"Bearer"` (chuẩn OAuth2-style, client gửi `Bearer <token>`).
- `userId`, `username`, `roles` (Set): tiện cho frontend hiển thị / phân quyền phía client (phân quyền thật vẫn do server qua `hasRole`).

---

## Bước 5: `JwtService` — ký và kiểm tra token

Tạo package `security` và class `JwtService` (`security/JwtService.java`), `@Service`.

**Nhiệm vụ:**

1. Đọc `jwt.secret` và `jwt.expiration-ms` bằng `@Value`.
2. **`signingKey()`**: `secret.getBytes(StandardCharsets.UTF_8)` rồi `Keys.hmacShaKeyFor(keyBytes)`.
3. **`generateToken(UserDetails userDetails)`**:
   - `Jwts.builder().subject(userDetails.getUsername())`, `issuedAt`, `expiration`, `signWith(signingKey())`, `compact()`.
4. **`extractUsername(token)`**: parse payload, lấy `subject`.
5. **`isTokenValid(token, userDetails)`**: subject khớp username của `UserDetails` và chưa hết hạn.

**API jjwt 0.12:** dùng `Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token).getPayload()`.

---

## Bước 6: `CustomUserDetailsService` — nối User JPA với Spring Security

Tạo `security/CustomUserDetailsService.java`, implement `UserDetailsService`.

**Nhiệm vụ:**

1. `loadUserByUsername(String username)`:
   - `userRepository.findByUsername(username)` → nếu không có: `UsernameNotFoundException`.
2. Chuyển `Set<Role>` thành `List<GrantedAuthority>`: mỗi `role.getName()` bọc trong `SimpleGrantedAuthority` (trong DB nên lưu dạng `ROLE_USER`, `ROLE_ADMIN` để khớp `hasRole("ADMIN")` = authority `ROLE_ADMIN`).
3. Trả về `org.springframework.security.core.userdetails.User` (username, password đã hash, authorities).

Entity `User` của bạn đã `FetchType.EAGER` cho `roles` → tránh lỗi lazy khi build authorities.

---

## Bước 7: `JwtAuthenticationFilter` — gắn người dùng vào mỗi request

Tạo `security/JwtAuthenticationFilter.java`, extends `OncePerRequestFilter`, `@Component`.

**Luồng:**

1. Đọc header `Authorization`. Nếu không có hoặc không bắt đầu bằng `Bearer ` → `filterChain.doFilter` (không set authentication).
2. Lấy JWT = phần sau `Bearer `.
3. `jwtService.extractUsername(jwt)` trong try/catch: token hỏng → bỏ qua, không crash request.
4. Nếu `SecurityContextHolder.getContext().getAuthentication() == null` (chưa ai đăng nhập):
   - `userDetailsService.loadUserByUsername(username)`.
   - Nếu `jwtService.isTokenValid(jwt, userDetails)`:
     - Tạo `UsernamePasswordAuthenticationToken(userDetails, null, authorities)`.
     - `setDetails` với `WebAuthenticationDetailsSource`.
     - `SecurityContextHolder.getContext().setAuthentication(...)`.
5. Gọi `filterChain.doFilter`.

**Thứ tự filter:** filter này phải chạy **trước** `UsernamePasswordAuthenticationFilter` (cấu hình ở bước 10).

---

## Bước 8: `JwtAuthenticationEntryPoint` — 401 thống nhất cho API

Tạo `security/JwtAuthenticationEntryPoint.java`, implement `AuthenticationEntryPoint`, `@Component`.

**Nhiệm vụ:** Khi Spring Security từ chối vì chưa authenticated (không có token hợp lệ), ghi response:

- HTTP **401**
- `Content-Type: application/json`
- Body JSON, ví dụ: `error`, `status`

Dùng `ObjectMapper` (bean có sẵn của Spring Boot) để serialize `Map`.

---

## Bước 9: `AuthService` + `AuthServiceImpl` — xử lý đăng nhập

### 9.1. Interface

`service/AuthService.java`: method `AuthResponse login(LoginRequest request)`.

### 9.2. Implementation

`service/AuthServiceImpl.java`:

1. Inject `AuthenticationManager`, `UserRepository`, `JwtService`.
2. Trong `login`:
   - `authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password))`.
   - Nếu sai mật khẩu, Spring ném `BadCredentialsException` (xử lý ở bước 11).
3. Sau khi authenticate thành công, load lại `User` từ DB (có `id`, `roles`).
4. Tạo `UserDetails` tạm (cùng username/password/roles) để `jwtService.generateToken(userDetails)`.
5. Trả `new AuthResponse(token, "Bearer", userId, username, roleNames)`.

---

## Bước 10: Cấu hình `SecurityConfig`

Chỉnh `config/SecurityConfig.java` theo hướng **stateless JWT**:

### 10.1. Bean `PasswordEncoder`

Giữ `BCryptPasswordEncoder` (đã dùng khi đăng ký).

### 10.2. Bean `AuthenticationProvider`

- `DaoAuthenticationProvider`.
- `setUserDetailsService(customUserDetailsService)`.
- `setPasswordEncoder(passwordEncoder)`.

Inject `PasswordEncoder` vào method `@Bean` để tránh gọi `@Bean` method nội bộ sai cách (trùng instance).

### 10.3. Bean `AuthenticationManager`

```java
@Bean
public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
}
```

Spring Boot sẽ gắn `DaoAuthenticationProvider` vào manager toàn cục.

### 10.4. `SecurityFilterChain`

- `csrf(AbstractHttpConfigurer::disable)` — API JSON thường tắt CSRF (nếu sau này dùng cookie + CSRF thì cần thiết kế lại).
- `sessionManagement`: `SessionCreationPolicy.STATELESS`.
- `exceptionHandling`: `authenticationEntryPoint(jwtAuthenticationEntryPoint)`.
- `authorizeHttpRequests`:
  - `/api/auth/**` → `permitAll()` (register, login).
  - `/api/admin/**` → `hasRole("ADMIN")`.
  - `anyRequest()` → `authenticated()`.
- **Bỏ** `.httpBasic(...)` — không dùng Basic Auth nữa.
- `authenticationProvider(authenticationProvider)` (bean từ bước trên).
- `addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)`.

---

## Bước 11: `AuthController` và xử lý lỗi đăng nhập

### 11.1. Controller

Trong `controller/AuthController.java`:

- Inject thêm `AuthService`.
- Thêm `POST /api/auth/login`, nhận `@Valid LoginRequest`, trả `ResponseEntity<AuthResponse>`.

### 11.2. `GlobalExceptionHandler`

Trong `exception/GlobalExceptionHandler.java`:

- Thêm `@ExceptionHandler(BadCredentialsException.class)` trả **401** và message thân thiện (ví dụ “Sai tên đăng nhập hoặc mật khẩu”).
- Giữ handler cho `RuntimeException` (400) cho lỗi nghiệp vụ như “Username đã tồn tại”.

**Thứ tự handler:** khai báo handler cụ thể (`BadCredentialsException`) **trước** handler `RuntimeException` nếu trong tương lai có chồng lớp exception.

---

## Bước 12: Kiểm tra end-to-end

### 12.1. Chuẩn bị dữ liệu

- PostgreSQL chạy, bảng `roles` có ít nhất bản ghi `ROLE_USER` (đúng với `UserRegisterServiceImpl`).
- Đăng ký user mới qua `POST /api/auth/register`.

### 12.2. Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "ten_da_dang_ky",
  "password": "mat_khau"
}
```

Kỳ vọng: HTTP 200, JSON có `accessToken`, `tokenType: "Bearer"`, ...

### 12.3. Gọi API cần bảo vệ

```http
GET /api/... (bất kỳ route không thuộc permitAll)
Authorization: Bearer <accessToken>
```

Nếu thiếu token hoặc token sai: **401** từ entry point.

### 12.4. Biên dịch & test

```bash
./mvnw.cmd compile -DskipTests
./mvnw.cmd test
```

---

## Cấu trúc file tham chiếu (sau khi hoàn tất)

| Thành phần | Đường dẫn trong project |
|------------|-------------------------|
| Dependency JWT | `pom.xml` |
| Cấu hình JWT | `src/main/resources/application.properties` |
| Repository | `.../repository/UserRepository.java` |
| DTO | `.../dto/request/LoginRequest.java`, `.../dto/response/AuthResponse.java` |
| JWT & filter | `.../security/JwtService.java`, `JwtAuthenticationFilter.java`, `CustomUserDetailsService.java`, `JwtAuthenticationEntryPoint.java` |
| Nghiệp vụ login | `.../service/AuthService.java`, `AuthServiceImpl.java` |
| Security | `.../config/SecurityConfig.java` |
| API | `.../controller/AuthController.java` |
| Exception | `.../exception/GlobalExceptionHandler.java` |

---

## Mở rộng thường gặp (không bắt buộc trong bản tối thiểu)

- **Refresh token:** lưu refresh token (DB hoặc Redis), endpoint đổi refresh → access token mới; access token TTL ngắn.
- **Đăng ký trả luôn JWT:** sau `register`, gọi chung logic sinh token như `login`.
- **Blacklist / thu hồi token:** cần lưu trữ phía server (mất thuần “stateless” một phần).
- **CORS:** nếu frontend khác origin, cấu hình `CorsConfigurationSource` + `http.cors(...)`.
- **HTTPS:** bắt buộc trên production để Bearer token không bị lộ trên đường truyền.

---

## Tóm tắt một dòng

**Đăng nhập** xác thực username/password bằng `AuthenticationManager` + `UserDetailsService`; **JWT** chứng minh danh tính các request sau; **filter** đặt `SecurityContext`; **Security** cấu hình **STATELESS** và chỉ mở ` /api/auth/**` cho người chưa đăng nhập.
