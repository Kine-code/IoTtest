#include <WiFi.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "wifi_IoT";
const char* password = "eaut111111";
const char* mqtt_server = "192.169.10.234";  // MQTT Broker

WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);

String lastStatus = "{\"r\":[0,0],\"t\":0,\"h\":0}";

// ==== Log buffer ====
#define MAX_LOG 40
String logs[MAX_LOG];
int logIndex = 0;
void addLog(const String &msg) {
  String timeStr = String(millis() / 1000) + "s";
  logs[logIndex] = "[" + timeStr + "] " + msg;
  logIndex = (logIndex + 1) % MAX_LOG;
  Serial.println(logs[(logIndex - 1 + MAX_LOG) % MAX_LOG]);
}

// ==== MQTT callback ====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) == "home/relay/status") {
    lastStatus = "";
    for (unsigned int i = 0; i < length; i++) lastStatus += (char)payload[i];

    StaticJsonDocument<200> doc;
    if (deserializeJson(doc, lastStatus) == DeserializationError::Ok) {
      int r0 = doc["r"][0];
      int r1 = doc["r"][1];
      float t = doc["t"];
      float h = doc["h"];
      addLog("MQTT: R0=" + String(r0) + " R1=" + String(r1) +
             " | T=" + String(t, 1) + "°C H=" + String(h, 1) + "%");
    } else {
      addLog("MQTT: raw=" + lastStatus);
    }
  }
}

// ==== HTML giao diện ====
void handleRoot() {
  String html = R"HTML(
<!DOCTYPE html><html lang="vi">
<head>
<meta charset="UTF-8">
<title>ESP32 Gateway</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
body {font-family:Arial;background:#f5f5f5;margin:0;}
.header {background:#2196F3;color:#fff;padding:15px;text-align:center;}
.container {max-width:860px;margin:20px auto;padding:0 10px;}
.card {background:#fff;border-radius:14px;padding:20px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.12);}
.row {display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;}
.label {font-size:16px;font-weight:600;color:#333;}
.toggle {position:relative;width:140px;height:46px;border-radius:999px;background:#f44336;
box-shadow:inset 0 2px 6px rgba(0,0,0,.25);cursor:pointer;user-select:none;transition:background .18s ease;
display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;letter-spacing:.5px;}
.toggle .txt-on,.toggle .txt-off{position:relative;z-index:1;}
.toggle.on{background:#67c03a;}
.toggle .knob{position:absolute;top:3px;left:3px;height:40px;width:40px;border-radius:50%;
background:#e6e6e6;box-shadow:0 2px 6px rgba(0,0,0,.3);transition:left .18s ease;}
.toggle.on .knob{left:calc(100% - 43px);}
.toggle.on .txt-off{display:none;}
.toggle:not(.on) .txt-on{display:none;}
pre{background:#eee;padding:10px;max-height:220px;overflow:auto;border-radius:10px;}
canvas{max-height:280px;}
</style>
</head>
<body>
<div class="header"><h2>ESP32 Gateway</h2></div>
<div class="container">
<div class="card">
<h3>Relay</h3>
<div class="row"><div class="label">Relay 0: <b id="r0_txt">?</b></div>
<div id="sw0" class="toggle" onclick="toggleRelay(0)">
<span class="txt-off">OFF</span><span class="txt-on">ON</span><div class="knob"></div></div></div>
<div class="row"><div class="label">Relay 1: <b id="r1_txt">?</b></div>
<div id="sw1" class="toggle" onclick="toggleRelay(1)">
<span class="txt-off">OFF</span><span class="txt-on">ON</span><div class="knob"></div></div></div>
</div>
<div class="card">
<h3>Nhiệt độ &amp; Độ ẩm</h3>
<div id="dht">...</div><canvas id="chart"></canvas>
</div>
<div class="card"><h3>Logs</h3><pre id="logs">...</pre></div>
</div>

<script>
let labels=[],temps=[],hums=[];
function setSwitch(relay,on){const e=document.getElementById('sw'+relay);
e.classList.toggle('on',!!on);
document.getElementById('r'+relay+'_txt').textContent=on?'ON':'OFF';}

const ctx=document.getElementById('chart').getContext('2d');
const chart=new Chart(ctx,{type:'line',data:{labels:labels,datasets:[
{label:'Temp (°C)',data:temps,borderColor:'red',fill:false},
{label:'Hum (%)',data:hums,borderColor:'blue',fill:false}
]},options:{animation:false,scales:{y:{beginAtZero:true}}}});

async function refresh(){
  try{
    const res=await fetch('/status'); const js=await res.json();
    setSwitch(0,js.r[0]); setSwitch(1,js.r[1]);
    document.getElementById('dht').textContent=`T: ${js.t}°C | H: ${js.h}%`;
    labels.push(new Date().toLocaleTimeString());
    temps.push(js.t); hums.push(js.h);
    if(labels.length>30){labels.shift();temps.shift();hums.shift();}
    chart.update();
    const l=await fetch('/logs'); document.getElementById('logs').textContent=await l.text();
  }catch(e){console.error(e);}
}

async function toggleRelay(r){
  const on=!document.getElementById('sw'+r).classList.contains('on');
  setSwitch(r,on);
  await fetch(`/cmd/${r}/${on?'on':'off'}`);
}
setInterval(refresh,2000);
refresh();
</script>
</body></html>
)HTML";
  server.send(200, "text/html", html);
}

// ==== Xử lý API ====
void handleCmd() {
  String path = server.uri(); // /cmd/0/on
  int idx = path.indexOf('/', 1);
  int idx2 = path.indexOf('/', idx + 1);
  String relay = path.substring(idx + 1, idx2);
  String cmd = path.substring(idx2 + 1);
  client.publish(("home/relay/cmd/" + relay).c_str(), cmd.c_str());
  addLog("Send: Relay" + relay + " -> " + cmd);
  server.send(200, "text/plain", "OK");
}

void handleStatus() { server.send(200, "application/json", lastStatus); }

void handleLogs() {
  String out;
  for (int i = 0; i < 5; i++) {  // chỉ 5 log mới nhất
    int idx = (logIndex - 1 - i + MAX_LOG) % MAX_LOG;
    if (logs[idx].length()) out += logs[idx] + "\n";
  }
  server.send(200, "text/plain", out);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT...");
    if (client.connect("ESP32_Gateway")) {
      Serial.println("OK");
      client.subscribe("home/relay/status");
    } else {
      Serial.println("fail");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi: " + WiFi.localIP().toString());
  client.setServer(mqtt_server, 1883);
  client.setCallback(mqttCallback);
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/logs", handleLogs);
  server.onNotFound(handleCmd);
  server.begin();
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  server.handleClient();
}
