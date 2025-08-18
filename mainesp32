#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>

/*** WiFi ***/
const char* ssid     = "Phong_CNTT";
const char* password = "eaut111111";

/*** Nhận diện & bảo mật ***/
const char* ROOM_CODE = "P103";
const char* TOKEN     = "21";
const char* SERVER_URL= "http://192.169.11.68:3000/devices/state";

/*** WebServer ***/
WebServer server(80);

/*** GPIO ***/
const int led1 = 26;
const int btn1 = 13;
const int led2 = 25;
const int btn2 = 12;

// Nếu relay của bạn kích mức thấp, hãy set = true
const bool RELAY_ACTIVE_LOW = false;   // <<< đổi sang true nếu module relay active LOW

volatile bool reqBtn1 = false, reqBtn2 = false;
bool ledState1 = false, ledState2 = false;

unsigned long lastBtn1 = 0, lastBtn2 = 0;
const unsigned long DEBOUNCE_MS = 120;

// Gửi server không blocking
volatile bool needPublish = false;     // <<< cờ cần gửi server
unsigned long lastPublishTry = 0;

/*** Helper: auth ***/
bool ensureAuth() {
  if (!strlen(TOKEN)) return true;
  String tok = "";
  if (server.hasHeader("X-Auth")) tok = server.header("X-Auth");
  else if (server.hasHeader("Authorization")) {
    tok = server.header("Authorization");
    tok.replace("Bearer ", "");
  }
  return tok == TOKEN;
}

// set relay theo chính tả cực tính
void writeRelay(int pin, bool on) {
  if (RELAY_ACTIVE_LOW) digitalWrite(pin, on ? LOW : HIGH);
  else                  digitalWrite(pin, on ? HIGH : LOW);
}

/*** Đẩy trạng thái hiện tại về server (gọi từ loop khi needPublish = true) ***/
void publishState() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(400);                // <<< timeout ngắn để không lag
  if (!http.begin(String(SERVER_URL))) return;

  http.addHeader("Content-Type", "application/json");
  if (strlen(TOKEN)) http.addHeader("X-Auth", TOKEN);

  DynamicJsonDocument doc(256);
  doc["roomCode"] = ROOM_CODE;
  doc["ip"] = WiFi.localIP().toString();
  JsonObject channels = doc.createNestedObject("channels");
  channels["LED1"] = ledState1;
  channels["LED2"] = ledState2;

  String body; serializeJson(doc, body);
  http.POST(body);
  http.end();
}

/*** API: POST /api/control  {led:"LED1"|"LED2", state:"on"|"off"} ***/
void handleControl() {
  if (!ensureAuth()) { server.send(401, "application/json", "{\"error\":\"unauthorized\"}"); return; }
  if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"error\":\"bad_request\"}"); return; }

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"invalid_json\"}"); return; }

  String led = doc["led"] | "";
  bool on = String(doc["state"] | "") == "on";

  if (led == "LED1") { ledState1 = on; writeRelay(led1, on); }
  else if (led == "LED2") { ledState2 = on; writeRelay(led2, on); }
  else { server.send(400, "application/json", "{\"error\":\"unknown_channel\"}"); return; }

  DynamicJsonDocument resp(256);
  resp["ok"] = true; resp["roomCode"] = ROOM_CODE;
  resp["LED1"] = ledState1; resp["LED2"] = ledState2;
  String out; serializeJson(resp, out);
  server.send(200, "application/json", out);

  needPublish = true;                  // <<< báo loop gửi lên server
}

/*** API: GET /status ***/
void handleStatus() {
  DynamicJsonDocument doc(256);
  doc["roomCode"] = ROOM_CODE;
  doc["ip"] = WiFi.localIP().toString();
  doc["LED1"] = ledState1;
  doc["LED2"] = ledState2;
  String out; serializeJson(doc, out);
  server.send(200, "application/json", out);
}

/*** ISR ***/
void IRAM_ATTR isrBtn1() { reqBtn1 = true; }
void IRAM_ATTR isrBtn2() { reqBtn2 = true; }

void setup() {
  Serial.begin(115200);
  pinMode(led1, OUTPUT); pinMode(led2, OUTPUT);
  pinMode(btn1, INPUT_PULLUP); pinMode(btn2, INPUT_PULLUP);
  writeRelay(led1, false);
  writeRelay(led2, false);

  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print("."); }
  Serial.println(); Serial.print("WiFi connected. IP: "); Serial.println(WiFi.localIP());

  attachInterrupt(digitalPinToInterrupt(btn1), isrBtn1, FALLING);
  attachInterrupt(digitalPinToInterrupt(btn2), isrBtn2, FALLING);

  // <<< Thu thập header tùy biến để hasHeader("X-Auth") hoạt động
  const char* headerKeys[] = {"X-Auth", "Authorization", "Content-Type"};
  server.collectHeaders(headerKeys, 3);

  server.on("/api/control", HTTP_POST, handleControl);
  server.on("/status", HTTP_GET, handleStatus);
  server.begin();
}

void loop() {
  server.handleClient();
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();

  unsigned long now = millis();

  if (reqBtn1 && (now - lastBtn1 > DEBOUNCE_MS)) {
    reqBtn1 = false; lastBtn1 = now;
    ledState1 = !ledState1; writeRelay(led1, ledState1);
    needPublish = true;               // <<< không POST ngay ở đây
  }
  if (reqBtn2 && (now - lastBtn2 > DEBOUNCE_MS)) {
    reqBtn2 = false; lastBtn2 = now;
    ledState2 = !ledState2; writeRelay(led2, ledState2);
    needPublish = true;
  }

  // Gửi server khi cần, nhưng không spam
  if (needPublish && (now - lastPublishTry > 80)) {   // <<< trễ rất nhỏ, không cảm nhận lag
    lastPublishTry = now;
    publishState();
    needPublish = false;
  }
}
