(() => {
  async function handleRequest(request) {
    // Khai báo các biến để dễ dàng tùy chỉnh
    const subdomain_wk = "subdomain_wk"; // Tên workers.dev
    const storage ="storage" // Kho datasets
    const huggingFaceUser = "sv3353141345"; // Tên người dùng trên Hugging Face
    const token = "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"; // Token của acc HF
    const workersDomain = "khophim.workers.dev"; // Domain cho Worker
    const datasetUrl = `https://huggingface.co/api/datasets/${huggingFaceUser}/${storage}/tree/main`;
    const expectedPassword = "Admin@1234"; // Thay thế bằng mật khẩu của bạn

    // Lấy tên file từ URL request
    const url = new URL(request.url);
    const fileName = url.pathname.slice(1); // Bỏ dấu "/" đầu

    // Nếu truy cập vào URL gốc (không có file), yêu cầu mật khẩu
    if (fileName === "") {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader || !authHeader.startsWith("Basic ")) {
        // Yêu cầu người dùng nhập mật khẩu nếu chưa có
        return new Response("Unauthorized", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Enter password to access index"'
          }
        });
      }

      // Giải mã và kiểm tra mật khẩu
      const encodedCredentials = authHeader.split(" ")[1]; // Lấy phần sau "Basic "
      const decodedCredentials = atob(encodedCredentials); // Giải mã Base64
      const [username, password] = decodedCredentials.split(":");

      if (password !== expectedPassword) {
        // Nếu mật khẩu không đúng, trả về lỗi 403
        return new Response("Forbidden", { status: 403 });
      }

      // Nếu mật khẩu đúng, tiếp tục lấy danh sách file từ dataset
      try {
        // Gửi request để lấy metadata của dataset
        const metadataResponse = await fetch(datasetUrl, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!metadataResponse.ok) {
          return new Response("Failed to fetch dataset metadata: " + metadataResponse.statusText, {
            status: metadataResponse.status
          });
        }

        const metadata = await metadataResponse.json();
        const files = metadata.map((item) => item.path);

        // Trả về danh sách file có link
        const fileLinks = files.map((file) => `https://${subdomain_wk}.${workersDomain}/${file}`);
        return new Response(JSON.stringify({ fileLinks }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response("Internal Server Error: " + error.message, { status: 500 });
      }
    }

    // Nếu truy cập trực tiếp một file (có tên file), không yêu cầu mật khẩu
    else {
      try {
        // Gửi request để lấy file từ Hugging Face
        const fileUrl = `https://huggingface.co/datasets/${huggingFaceUser}/${storage}/resolve/main/${fileName}`;
        const rangeHeader = request.headers.get("Range");
        const fileResponse = await fetch(fileUrl, {
          headers: rangeHeader
            ? {
                Authorization: `Bearer ${token}`,
                "Range": rangeHeader
              }
            : {
                Authorization: `Bearer ${token}`
              }
        });

        if (!fileResponse.ok) {
          return new Response("Failed to fetch file: " + fileResponse.statusText, {
            status: fileResponse.status
          });
        }

        // Trả về response kèm "Range" để hỗ trợ tua nhanh
        const responseHeaders = new Headers(fileResponse.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        return new Response(fileResponse.body, {
          status: fileResponse.status,
          headers: responseHeaders
        });

      } catch (error) {
        return new Response("Internal Server Error: " + error.message, { status: 500 });
      }
    }
  }

  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });
})();
