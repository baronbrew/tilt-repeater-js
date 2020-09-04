//espruino_repeater_2.02.js
// Use "save on send" -> "direct to flash" in Web IDE settings
// Needs 2v00 or above - preferably 2v01 or later

function flashLED (color,flashTime){
  digitalPulse(D2,1,50);
  clearTimeout(colorTimeout);
  colorTimeout = setTimeout(function(){
  if (color == 1){
    analogWrite(D1,1);
  }
  if (color == 2){
    analogWrite(D2,1);
  }
  if (color == 4){
    analogWrite(D1,0.2);
    analogWrite(D31,1);
  }
  if (color == 5){
    analogWrite(D1,1);
    analogWrite(D2,0.3);
  }
  if (color == 6){
    analogWrite(D31,1);
  }
  if (color == 7){
    analogWrite(D1,0.8);
    analogWrite(D2,1);
  }
  if (color == 8){
    analogWrite(D1,1);
    analogWrite(D2,0.2);
    analogWrite(D31,0.2);
  }
    },500);
  
setTimeout(function(){
    digitalWrite(D1,0);
    digitalWrite(D2,0);
    digitalWrite(D31,0);
},500 + flashTime);

}

function arrayBufferToHex (arrayBuffer){
  return (new Uint8Array(arrayBuffer)).slice().map(x=>(256+x).toString(16).substr(-2)).join("");
}

function startScan (){
  NRF.setScan(function(d) {
    var hexData = arrayBufferToHex(d.manufacturerData);
    if (hexData.substr(8,3) == 'bb' + color){//matches key portion of iBeacon UUID for a Tilt
      changeInterval(tiltInterval, 980); //after finding a Tilt, scan for the next advertisement in 980ms. (assumes a 20ms processing time)
      flashLED(color,50);//flash green LED to indicate a connection
      NRF.setScan();//stop scanning since tilt has been found
      //console.log(hexData);
      var majorValue = parseInt(hexData.substr(36,4),16);//set values to repeat
      var minorValue = parseInt(hexData.substr(40,4),16);//set values to repeat
      var uuidValue = parseInt(color + hexData[11], 16);//convert tilt color to hex value for use in UUID
      console.log(majorValue, minorValue, uuidValue);
      NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : majorValue, minor : minorValue, rssi : -58 }),{interval:1000});
      cycleCount = 0;
      scanCounter = 0;
    }
  }, { filters: [{ manufacturerData: { 0x004C: {} } }] });
  //try to sync
  if (scanCounter == 1){
    changeInterval(tiltInterval, 1000);//change to 1 second interval after initial interval of 980ms (assumes 20ms processing time no longer needed)
  }
  //fast search if not found in sync
  if (scanCounter == 120){//starting scanning 4x more frequently if tilt not found after 120 tries
    changeInterval(tiltInterval, 240);
    scanCounter = 2;//skips changing scan to 1 second interval, keeps scanning 4x
    cycleCount++;
  }
  if (cycleCount > 239){//reset iBeacon after 2 hours not connecting
    cycleCount = 0;
    NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, startingUUID, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -58 }),{interval:1000});
  }
  scanCounter++;
  //console.log(scanCounter);
  //stop scan after x ms
  setTimeout(function () { NRF.setScan(); }, 110);//main function to duty cycle scanning, scan is actually only 10ms, assumes 100ms for scanning to start up
}

// fix for powersave issue in 2v01 and earlier
digitalWrite(D7,0); 
//enable watchdog timer - disabling because when asleep it causes a reboot
//E.enableWatchdog(5);

// set power
NRF.setTxPower(4);
// intialize global variables
var cycleCount = 0;
var colorTimeout;
var startingUUID;
var scanCounter = 0;//number of scans counted starts from 0
var color = 0;//no tilt color selected state
var presses = 0;//initial no Beacon state
var tiltInterval;//global variable for managing tilt scan frequency
// remove all watches
clearWatch();
//cleart intervals and timeouts
clearInterval();
clearTimeout();
NRF.setAdvertising({},{});
setWatch(function() {
  if (presses == 0){//first time running
  presses++;
  color = presses;//start with red
  flashLED(color,200);
  tiltInterval = setInterval(function (){ startScan(); }, 240);//start with frequent scan
  //jump to fast search
  scanCounter = 120;//skip to 120 to maintain frequent scanning
  startingUUID = parseInt('0x' + color + '0');
  //start advertising initial repeated color whith zeros for sg and temp values
  NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, startingUUID, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -58 }),{interval:500});
  return;//finished with first time running
  }
  presses++;
  if (presses < 9) {
    flashLED(presses,200);
    color = presses;
  }
  //conditional for presses past valid color (8)
  if (presses == 9){//turns off advertising and scanning, flashed red LED to indicate turned off
    clearInterval(tiltInterval);
    clearTimeout(colorTimeout);
    digitalPulse(LED1, 1, 100);
    NRF.setAdvertising({},{});
    NRF.sleep();
    color = 0;
    return;
  }
  if (presses > 9){
    presses = 1;//start over with presses (color)
    color = presses;
    NRF.wake();
    tiltInterval = setInterval(function (){ startScan(); }, 240);//start with frequent scan
    flashLED(presses,200);
  }
  //jump to fast search
  scanCounter = 120;//skip to 120 to maintain frequent scanning
  startingUUID = parseInt('0x' + presses + '0');
  //start advertising initial repeated color whith zeros for sg and temp values
  NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, startingUUID, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -58 }),{interval:500});
}, BTN, { repeat: true, debounce : 50, edge: "rising" });
