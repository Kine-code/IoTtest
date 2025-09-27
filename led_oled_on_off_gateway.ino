#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>

// ==== WiFi ====
const char* ssid     = "Phong_CNTT";
const char* password = "eaut111111";

// ==== Controller ====
String CONTROLLER_BASE = "http://192.168.1.118";  // IP ESP32 Controller

WiFiServer server(80);

// ==== Log buffer (tối đa 20 dòng) ====
#define MAX_LOG 20
String logs[MAX_LOG];
int logIndex = 0;

void addLog(const String &msg) {
  Serial.println(msg); // in ra Serial
  logs[logIndex] = msg;
  logIndex = (logIndex + 1) % MAX_LOG;
}

String getLogsHtml() {
  String html = "<html><head><title>ESP32 Gateway Logs</title></head><body>";
  html += "<h2>Logs (trạng thái relay)</h2><pre>";
  for (int i = 0; i < MAX_LOG; i++) {
    int idx = (logIndex + i) % MAX_LOG;
    if (logs[idx].length()) html += logs[idx] + "\n";
  }
  html += "</pre><a href='/'>Quay lại</a></body></html>";
  return html;
}

bool httpForwardGET(const String& path, String& payload, int& httpCode) {
  HTTPClient http;
  String url = CONTROLLER_BASE + path;
  http.begin(url);
  httpCode = http.GET();
  if (httpCode > 0) payload = http.getString();
  else payload = "";
  http.end();
  return httpCode == 200;
}

void sendHttpHeader(WiFiClient& client, const char* mime = "text/html") {
  client.println("HTTP/1.1 200 OK");
  client.print("Content-Type: "); client.println(mime);
  client.println("Connection: close");
  client.println("Cache-Control: no-cache");
  client.println();
}

void handleHttp(WiFiClient& client, const String& reqLine) {
  int sp1 = reqLine.indexOf(' ');
  int sp2 = reqLine.indexOf(' ', sp1 + 1);
  String path = "/";
  if (sp1 > 0 && sp2 > sp1) path = reqLine.substring(sp1 + 1, sp2);

  if (path == "/") {
  sendHttpHeader(client, "text/html");
  client.println(R"HTML(
    <!DOCTYPE html>
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ESP32 Gateway</title>
    <style>
      body { font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:0; }
      .header { background:#2196F3; color:white; padding:16px; text-align:center; }
      .container { max-width:500px; margin:20px auto; padding:10px; }
      .card { background:white; padding:20px; margin:12px 0; border-radius:12px;
              box-shadow:0 2px 6px rgba(0,0,0,0.2); text-align:center; }
      .title { font-size:20px; margin-bottom:12px; }
      .state { font-weight:bold; margin:10px 0; }
      .btn { display:inline-block; padding:12px 24px; margin:6px;
            border:none; border-radius:8px; font-size:16px; color:white; cursor:pointer; }
      .on { background:#4CAF50; }
      .off { background:#f44336; }
      .nav { margin-top:20px; text-align:center; }
      .nav a { margin:0 10px; text-decoration:none; color:#2196F3; font-weight:bold; }
    </style>
    </head>
    <body>
      <div class="header">
        <h2>ESP32 Gateway</h2>
        <div id="info">Đang tải trạng thái...</div>
      </div>
      <div class="container">

        <div class="card">
          <div class="title">Relay 0</div>
          <div id="state0" class="state">...</div>
          <button class="btn on"  onclick="sendCmd(0,'on')">ON</button>
          <button class="btn off" onclick="sendCmd(0,'off')">OFF</button>
        </div>

        <div class="card">
          <div class="title">Relay 1</div>
          <div id="state1" class="state">...</div>
          <button class="btn on"  onclick="sendCmd(1,'on')">ON</button>
          <button class="btn off" onclick="sendCmd(1,'off')">OFF</button>
        </div>

        <div class="nav">
          <a href="/status" target="_blank">[JSON Status]</a>
          <a href="/log" target="_blank">[Xem Log]</a>
        </div>
      </div>

    <script>
    async function refresh() {
      try {
        const res = await fetch('/status');
        const js = await res.json();
        if(js.error){
          document.getElementById('info').textContent = "Controller OFFLINE";
          document.getElementById('state0').textContent = "-";
          document.getElementById('state1').textContent = "-";
        } else {
          document.getElementById('info').textContent = "Controller ONLINE";
          document.getElementById('state0').textContent = js.r[0] ? "ON" : "OFF";
          document.getElementById('state1').textContent = js.r[1] ? "ON" : "OFF";
        }
      } catch(e) {
        document.getElementById('info').textContent = "Không kết nối Gateway";
      }
    }

    async function sendCmd(relay, state) {
      try {
        await fetch(`/relay/${relay}/${state}`); // gọi API
        refresh(); // cập nhật lại trạng thái
      } catch(e) {
        console.log("Lỗi gửi lệnh", e);
      }
    }

    refresh();
    setInterval(refresh, 2000);
    </script>
    </body>
    </html>
    )HTML");
      return;
    }


  if (path == "/log") {
    sendHttpHeader(client, "text/html");
    client.print(getLogsHtml());
    return;
  }

  if (path.startsWith("/relay/")) {
    String payload; int code;
    bool ok = httpForwardGET(path, payload, code);

    // Ghi log
    addLog("Client -> " + path + (ok ? " [OK]" : " [FAIL]"));

    sendHttpHeader(client, "text/html");
    client.println("<h2>Lệnh đã gửi: " + path + "</h2>");
    client.println("<a href='/'>Quay lại</a>");
    return;
  }

  if (path == "/status") {
    String payload; int code;
    bool ok = httpForwardGET("/status", payload, code);
    sendHttpHeader(client, "application/json");
    client.println(ok ? payload : "{\"error\":\"Controller offline\"}");
    return;
  }

  client.println("HTTP/1.1 404 Not Found\r\n\r\nNot Found");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("Truy cập Gateway tại: http://");
  Serial.println(WiFi.localIP());
  server.begin();
}

void loop() {
  WiFiClient client = server.available();
  if (client) {
    String reqLine = "";
    while (client.connected() && client.available() == 0) delay(1);
    if (client.connected()) {
      reqLine = client.readStringUntil('\n'); reqLine.trim();
      while (client.connected() && client.available()) {
        String dump = client.readStringUntil('\n');
        if (dump == "\r" || dump == "") break;
      }
      if (reqLine.length() > 0) {
        Serial.println(reqLine);
        handleHttp(client, reqLine);
      }
    }
    delay(1);
    client.stop();
  }
}
