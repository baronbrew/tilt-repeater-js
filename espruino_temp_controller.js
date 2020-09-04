//espruino_temp_controller_0.01.js
// Use "save on send" -> "direct to flash" in Web IDE settings
// Needs 2v00 or above - preferably 2v01 or later

function flashLED (color,flashTime){
    digitalPulse(D2,1,50);
  }
  
  function arrayBufferToHex (arrayBuffer){
    return (new Uint8Array(arrayBuffer)).slice().map(x=>(256+x).toString(16).substr(-2)).join("");
  }
  
  function startScan (){
    NRF.setScan(function(d) {
      var hexData = arrayBufferToHex(d.manufacturerData);
      if (hexData.substr(8,4) == 'bb' + color + '0'){//matches key portion of iBeacon UUID for a Tilt
        changeInterval(tiltInterval, 850); //after finding a Tilt, scan for the next advertisement in 900ms. (assumes a 20ms processing time)
        flashLED(color,50);//flash green LED to indicate a connection
        //console.log(hexData);
        tiltTemp = parseInt(hexData.substr(36,4),16);//set values to repeat
        var minorValue = parseInt(hexData.substr(40,4),16);//set values to repeat
        var uuidValue = parseInt(color + hexData[11], 16);//convert tilt color to hex value for use in UUID
        console.log(tiltTemp, minorValue, uuidValue);
        //NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : majorValue, minor : minorValue, rssi : -59 }),{interval:1000});
        cycleCount = 0;
        scanCounter = 0;
        NRF.setScan();
      }
      if (hexData.substr(8,4) == 'cc' + color + '0'){//matches key portion of iBeacon UUID for a Tilt
        flashLED(color,50);//flash green LED to indicate a connection
        flashLED(color,50);//flash green LED to indicate a connection
        //console.log(hexData);
        targetTemp = parseInt(hexData.substr(36,4),16);//set values to repeat
        var minorValue = parseInt(hexData.substr(40,4),16);//set values to repeat
        var uuidValue = parseInt(color + hexData[11], 16);//convert tilt color to hex value for use in UUID
        console.log(targetTemp, minorValue, uuidValue);

        //NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : majorValue, minor : minorValue, rssi : -59 }),{interval:1000});
        cycleCount = 0;
        scanCounter = 0;
      }
      if (tiltTemp != null && targetTemp != null){
      if (tiltTemp < targetTemp){
          digitalWrite(D16,1)
       }else{
        digitalWrite(D16,0)
       }
     }
    }, { filters: [{ manufacturerData: { 0x004C: {} } }] });
    scanCounter++;
    //console.log(scanCounter);
    //stop scan after x ms
    setTimeout(function () { NRF.setScan(); }, 500);//main function to duty cycle scanning, scan is actually only 10ms, assumes 100ms for scanning to start up
  }
  
  // fix for powersave issue in 2v01 and earlier
  digitalWrite(D7,0); 
  //enable watchdog timer - disabling because when asleep it causes a reboot
  //E.enableWatchdog(5);
  
  // set power
  NRF.setTxPower(4);
  // intialize global variables
  var tiltTemp;
  var targetTemp;
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
    tiltInterval = setInterval(function (){ startScan(); }, 610);//start with frequent scan
    //jump to fast search
    scanCounter = 120;//skip to 120 to maintain frequent scanning
    startingUUID = parseInt('0x' + color + '0');
    //start advertising initial repeated color whith zeros for sg and temp values
    //NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, startingUUID, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -59 }),{interval:500});
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
      tiltInterval = setInterval(function (){ startScan(); }, 600);//start with frequent scan
      flashLED(presses,200);
    }
    //jump to fast search
    scanCounter = 120;//skip to 120 to maintain frequent scanning
    startingUUID = parseInt('0x' + presses + '0');
    //start advertising initial repeated color whith zeros for sg and temp values
    //NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, startingUUID, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -59 }),{interval:1000});
  }, BTN, { repeat: true, debounce : 50, edge: "rising" });
  