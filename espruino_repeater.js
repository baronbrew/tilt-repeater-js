function arrayBufferToHex (arrayBuffer){
var view = new Uint8Array(arrayBuffer);
var result = '';
var value;
for (var i = 0; i < view.length; i++) {
    value = view[i].toString(16);
    result += (value.length === 1 ? '0' + value : value);
  }

  return result;
}

function startScan (){
NRF.setScan(function(d) {
if ( d.manufacturerData !== undefined ){
var hexData = arrayBufferToHex(d.manufacturerData);
  if (hexData[8] + hexData[9] + hexData[10] + hexData[11] == 'bb' + color + '0'){
    changeInterval(tiltInterval, 980); 
    digitalPulse(LED2, 1, 3);
     NRF.setScan();
     //console.log(hexData);
     var majorValue = '0x' + hexData[36] + hexData[37] + hexData[38] + hexData[39];
     var minorValue = '0x' + hexData[40] + hexData[41] + hexData[42] + hexData[43];
     var uuidValue = parseInt('0x' + color + hexData[11]);
     NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : majorValue, minor : minorValue, rssi : -59 }),{interval:2000});
     scanCounter = 0;
  }
}
});
//try to sync
if (scanCounter == 1){
  changeInterval(tiltInterval, 1000);
}
//fast search if not found in sync
if (scanCounter == 120){
  changeInterval(tiltInterval, 190);
  scanCounter = 2;
}
scanCounter++;
//console.log(scanCounter);
//stop scan after x ms
setTimeout(function () { NRF.setScan(); }, 110);
}

// set power
NRF.setTxPower(4);
// intialize global variables
var scanCounter = 0;
var color = 0;
var presses = 9;
var tiltInterval;
//enable watchdog timer
E.enableWatchdog(5);
// remove all watches
clearWatch();
//cleart intervals and timeouts
clearInterval();
clearTimeout();
setWatch(function() {
  presses++;
  //conditional for presses past valid color (8)
  if (presses == 9){
    NRF.sleep();
    clearInterval(tiltInterval);
    digitalPulse(LED1, 1, 50);
    return;
  }
  if (presses > 9){
    presses = 1;
    NRF.wake();
    tiltInterval = setInterval(function (){ startScan(); }, 190);
    digitalPulse(LED2, 1, 50);
  }else if (presses < 9) {
      digitalPulse(LED2, 1, 50);
  }
  //jump to fast search
  scanCounter = 120;
  var uuidValue = parseInt('0x' + presses + '0');
  //start advertising initial repeated color whith zeros for sg and temp values
  NRF.setAdvertising(require("ble_ibeacon").get({ uuid : [0xa4, 0x95, 0xbb, uuidValue, 0xc5, 0xb1, 0x4b, 0x44, 0xb5, 0x12, 0x13, 0x70, 0xf0, 0x2d, 0x74, 0xde], major : 0, minor : 0, rssi : -59 }),{interval:500});
  color = presses;
}, BTN, { repeat: true, debounce : 50, edge: "rising" });
