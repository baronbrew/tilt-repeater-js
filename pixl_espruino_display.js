//pixl_espruino_display.js
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
      //digitalPulse(LED2, 1, 3);//flash green LED to indicate a connection
      NRF.setScan();//stop scanning since tilt has been found
      var majorValue = parseInt(hexData.substr(36,4),16);
      var minorValue = parseInt(hexData.substr(40,4),16);
      scanCounter = 0;
//display stuff for pixl
var sg = (minorValue/1000).toFixed(3);
var t = majorValue;
      // Clear display
  g.clear();
  // Use the small font for a title
  g.setFontBitmap();
  g.drawString("SG (pre-cal):",0,0);
  // Use a large font for the value itself
  g.setFontVector(22);
  g.drawString(sg, (g.getWidth()-g.stringWidth(sg))/1,7);
  //temperature
  // Use the small font for a title
  g.setFontBitmap();
  g.drawString("Temp. (pre-cal):",0,33);
  // Use a large font for the value itself
  g.setFontVector(22);
  g.drawString(t + "°F", (g.getWidth()-g.stringWidth(t + " F"))/1,40);
  // Update the screen
  g.flip();   
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
  }
  scanCounter++;
  //console.log(scanCounter);
  //stop scan after x ms
  setTimeout(function () { NRF.setScan(); }, 110);//main function to duty cycle scanning, scan is actually only 10ms, assumes 100ms for scanning to start up
}

// set power
NRF.setTxPower(4);
// intialize global variables
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
    tiltInterval = setInterval(function (){ startScan(); }, 240);//start with frequent scan (min. interval without memory error is 240ms)
    //digitalPulse(LED2, 1, 50);
    console.log(presses);
  }else if (presses < 9) {
      //digitalPulse(LED2, 1, 50);
    console.log(presses);
  }
  //jump to fast search
  scanCounter = 120;//skip to 120 to maintain frequent scanning
  color = presses;
}, BTN, { repeat: true, debounce : 50, edge: "rising" });