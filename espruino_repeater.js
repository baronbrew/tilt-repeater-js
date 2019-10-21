//espruino_repeater.js
// Use "save on send" -> "direct to flash" in Web IDE settings
// Needs 2v00 or above - preferably 2v01 or later

function arrayBufferToHex (arrayBuffer){
  return (new Uint8Array(arrayBuffer)).slice().map(x=>(256+x).toString(16).substr(-2)).join("");
}

function startScan (){
  NRF.setScan(function(d) {
    var hexData = arrayBufferToHex(d.manufacturerData);
    if (hexData.substr(8,4) == 'bb' + color + '0'){//matches key portion of iBeacon UUID for a Tilt
      changeInterval(tiltInterval, 980); //after finding a Tilt, scan for the next advertisement in 980ms. (assumes a 20ms processing time)
      digitalPulse(LED2, 1, 3);//flash green LED to indicate a connection
      NRF.setScan();//stop scanning since tilt has been found
      //console.log(hexData);
      var majorValue = parseInt(hexData.substr(36,4),16);//set values to repeat
      var minorValue = parseInt(hexData.substr(40,4),16);//set values to repeat
      uuidValue = parseInt(color + hexData[11], 16);//convert tilt color to hex value for use in UUID
      console.log(majorValue, minorValue, uuidValue);
      NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : majorValue, minor : minorValue, rssi : -59 }),{interval:1000});
      scanCounter = 0;
      scanCycle = 0;
    }
  }, { filters: [{ manufacturerData: { 0x004C: {} } }] });
  //try to sync
  if (scanCounter == 1){
    changeInterval(tiltInterval, 1000);//change to 1 second interval after initial interval of 980ms (assumes 20ms processing time no longer needed)
  }
  //fast search if not found in sync
  if (scanCounter == 120){//starting scanning 4x more frequently if tilt not found after 120 tries
    scanCycle++;
    changeInterval(tiltInterval, 240);
    scanCounter = 2;//skips changing scan to 1 second interval, keeps scanning 4x
  }
  scanCounter++;
  //console.log(scanCounter);
  //go to power saving mode and reset sg and temp to 0 after 5 scan cycles
  if (scanCycle % 10 === 7 && scanCounter == 3){
    changeInterval(tiltInterval, 10000);
    NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -59 }),{interval:1000});
  }else if (scanCycle % 10 === 9 && scanCounter == 3){
  changeInterval(tiltInterval, 240);
  }
  setTimeout(function () { NRF.setScan(); }, 110);
}

// fix for powersave issue in 2v01 and earlier
digitalWrite(D7,0); 
//enable watchdog timer - disabling because when asleep it causes a reboot
//E.enableWatchdog(5);

// set power
NRF.setTxPower(4);
// intialize global variables
var scanCycle = 0;
var uuidValue = 0x00;
var scanCounter = 0;//number of scans counted starts from 0
var color = 0;//no tilt color selected state
var presses = 9;//not advertising state
var tiltInterval;//global variable for managing tilt scan frequency
// remove all watches
clearWatch();
//cleart intervals and timeouts
clearInterval();
clearTimeout();
NRF.setAdvertising({},{});
setWatch(function() {
  presses++;
  //conditional for presses past valid color (8)
  if (presses == 9){//turns off advertising and scanning, flashed red LED to indicate turned off
    NRF.sleep();
    clearInterval(tiltInterval);
    digitalPulse(LED1, 1, 50);
    return;
  }
  if (presses > 9){
    presses = 1;//start over with presses (color)
    NRF.wake();
    tiltInterval = setInterval(function (){ startScan(); }, 240);//start with frequent scan
    digitalPulse(LED2, 1, 50);
  }else if (presses < 9) {
      digitalPulse(LED2, 1, 50);
  }
  //jump to fast search
  scanCounter = 120;//skip to 120 to maintain frequent scanning
  uuidValue = parseInt('0x' + presses + '0');
  //start advertising initial repeated color whith zeros for sg and temp values
  NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -59 }),{interval:500});
  color = presses;
}, BTN, { repeat: true, debounce : 50, edge: "rising" });
