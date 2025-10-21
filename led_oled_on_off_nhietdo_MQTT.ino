#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ==== WiFi ====
const char* ssid = "wifi_IoT";
const char* password = "eaut111111";

// ==== MQTT Broker ====
const char* mqtt_server = "192.169.10.234";  

WiFiClient espClient;
PubSubClient client(espClient);

// ==== Relay + Button ====
const int relayPin[2] = {26, 25};
const int btnPin[2]   = {13, 12};
bool relayState[2] = {false, false};
const bool RELAY_ACTIVE_LOW = false;
volatile bool btnFlag[2] = {false, false};
volatile unsigned long lastIrq[2] = {0, 0};

// ==== DHT ====
#define DHTPIN 23
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
float lastTemp = 0, lastHum = 0;

// ==== OLED ====
#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDR 0x3C
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// ===== Helper =====
void writeRelay(int i, bool on) {
  relayState[i] = on;
  digitalWrite(relayPin[i], on ^ RELAY_ACTIVE_LOW);
}

void publishStatus() {
  char buf[128];
  sprintf(buf, "{\"r\":[%d,%d],\"t\":%.1f,\"h\":%.1f}",
          relayState[0], relayState[1], lastTemp, lastHum);
  client.publish("home/relay/status", buf, true);
  Serial.println("Publish: " + String(buf));
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("ESP32 Controller");
  display.setCursor(0, 12);
  display.print("IP: " + WiFi.localIP().toString());
  display.setCursor(0, 24);
  display.printf("T: %.1fC  H: %.1f%%", lastTemp, lastHum);
  display.setCursor(0, 40);
  display.printf("R0: %s  R1: %s", relayState[0] ? "ON" : "OFF", relayState[1] ? "ON" : "OFF");
  display.display();
}

// ===== ISR Button =====
IRAM_ATTR void isrBtn0() {
  unsigned long now = millis();
  if (now - lastIrq[0] > 200) { btnFlag[0] = true; lastIrq[0] = now; }
}
IRAM_ATTR void isrBtn1() {
  unsigned long now = millis();
  if (now - lastIrq[1] > 200) { btnFlag[1] = true; lastIrq[1] = now; }
}

// ===== MQTT =====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  if (String(topic) == "home/relay/cmd/0") writeRelay(0, msg == "on");
  if (String(topic) == "home/relay/cmd/1") writeRelay(1, msg == "on");
  publishStatus();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT...");
    if (client.connect("ESP32_Controller")) {
      Serial.println("OK");
      client.subscribe("home/relay/cmd/0");
      client.subscribe("home/relay/cmd/1");
      publishStatus();
    } else {
      Serial.println("fail");
      delay(2000);
    }
  }
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 2; i++) {
    pinMode(relayPin[i], OUTPUT);
    writeRelay(i, false);
    pinMode(btnPin[i], INPUT_PULLUP);
  }
  attachInterrupt(digitalPinToInterrupt(btnPin[0]), isrBtn0, FALLING);
  attachInterrupt(digitalPinToInterrupt(btnPin[1]), isrBtn1, FALLING);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("WiFi: " + WiFi.localIP().toString());

  client.setServer(mqtt_server, 1883);
  client.setCallback(mqttCallback);

  dht.begin();
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  updateDisplay();
}

// ===== Loop =====
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // DHT
  static unsigned long lastDht = 0;
  if (millis() - lastDht > 5000) {
    lastDht = millis();
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h) && !isnan(t)) { lastHum = h; lastTemp = t; }
    publishStatus();
    updateDisplay();
  }

  // Nút bấm
  for (int i = 0; i < 2; i++) {
    if (btnFlag[i]) {
      noInterrupts(); btnFlag[i] = false; interrupts();
      writeRelay(i, !relayState[i]);
      publishStatus();
      updateDisplay();
    }
  }
}
